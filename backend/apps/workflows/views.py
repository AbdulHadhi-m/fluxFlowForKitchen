from django.db.models import Q, Count, Sum
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.workflows.models import (
    Workflow,
    WorkflowApprovalRequest,
    WorkflowEventLog,
    WorkflowExecution,
    WorkflowTask,
    WorkflowWebhookCredential,
)
from apps.workflows.services import (
    ApprovalService,
    AutomationAnalyticsService,
    WorkflowExecutionService,
    WorkflowService,
    WorkflowTemplateService,
)
from apps.workflows.serializers import (
    WorkflowApprovalRequestSerializer,
    WorkflowEventLogSerializer,
    WorkflowExecutionSerializer,
    WorkflowSerializer,
    WorkflowTaskSerializer,
    WorkflowWebhookCredentialSerializer,
)

WORKFLOW_PERMS = "workflows.view"
WORKFLOW_MANAGE_PERMS = "workflows.edit"


def _restaurant(request):
    return RestaurantService.get_user_restaurant(request.user)


class WorkflowListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission(WORKFLOW_MANAGE_PERMS)()]
        return [IsAuthenticated(), require_permission(WORKFLOW_PERMS)()]

    @extend_schema(summary="List Workflows")
    def get(self, request):
        restaurant = _restaurant(request)
        queryset = Workflow.objects.filter(
            Q(restaurant=restaurant) | Q(scope="GLOBAL", restaurant__isnull=True)
        ).order_by("-updated_at")

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(code__icontains=search))

        trigger_type = request.query_params.get("trigger_type")
        if trigger_type:
            queryset = queryset.filter(trigger_type=trigger_type)

        category = request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        wf_status = request.query_params.get("status")
        if wf_status:
            queryset = queryset.filter(status=wf_status)

        executions = WorkflowExecution.objects.filter(
            workflow__in=queryset
        ).values("workflow_id").annotate(total=Count("id"))
        exec_map = {str(e["workflow_id"]): e["total"] for e in executions}
        for wf in queryset:
            wf.execution_count = exec_map.get(str(wf.id), 0)

        return Response({"success": True, "data": WorkflowSerializer(queryset, many=True).data})

    @extend_schema(summary="Create Workflow")
    def post(self, request):
        restaurant = _restaurant(request)
        scope = request.data.get("scope", "RESTAURANT")
        workflow = WorkflowService.create_workflow(
            restaurant=restaurant if scope == "RESTAURANT" else None,
            user=request.user,
            data=request.data,
        )
        return Response({"success": True, "data": WorkflowSerializer(workflow).data}, status=status.HTTP_201_CREATED)


class WorkflowDetailView(APIView):
    def get_permissions(self):
        if self.request.method in ("PATCH", "DELETE"):
            return [IsAuthenticated(), require_permission(WORKFLOW_MANAGE_PERMS)()]
        return [IsAuthenticated(), require_permission(WORKFLOW_PERMS)()]

    def _get_workflow(self, request, workflow_id):
        restaurant = _restaurant(request)
        workflow = Workflow.objects.filter(
            Q(restaurant=restaurant) | Q(scope="GLOBAL", restaurant__isnull=True),
            id=workflow_id,
        ).first()
        if workflow is None:
            raise ValueError("Workflow not found or not accessible")
        return workflow

    @extend_schema(summary="Retrieve Workflow")
    def get(self, request, workflow_id):
        workflow = self._get_workflow(request, workflow_id)
        return Response({"success": True, "data": WorkflowSerializer(workflow).data})

    @extend_schema(summary="Update Workflow")
    def patch(self, request, workflow_id):
        workflow = self._get_workflow(request, workflow_id)
        updated = WorkflowService.update_workflow(workflow, request.user, request.data)
        return Response({"success": True, "data": WorkflowSerializer(updated).data})

    @extend_schema(summary="Delete Draft Workflow")
    def delete(self, request, workflow_id):
        workflow = self._get_workflow(request, workflow_id)
        if workflow.status != "DRAFT":
            return Response(
                {"success": False, "message": "Only DRAFT workflows can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        workflow.delete()
        return Response({"success": True, "message": "Workflow deleted."}, status=status.HTTP_200_OK)


class WorkflowValidateView(APIView):
    permission_classes = [IsAuthenticated, require_permission(WORKFLOW_PERMS)]

    @extend_schema(summary="Validate Workflow Definition")
    def post(self, request, workflow_id):
        restaurant = _restaurant(request)
        workflow = Workflow.objects.filter(
            Q(restaurant=restaurant) | Q(scope="GLOBAL", restaurant__isnull=True),
            id=workflow_id,
        ).first()
        if workflow is None:
            return Response({"success": False, "message": "Workflow not found."}, status=status.HTTP_404_NOT_FOUND)
        result = WorkflowService.validate(workflow)
        code = status.HTTP_200_OK if result["valid"] else status.HTTP_422_UNPROCESSABLE_ENTITY
        return Response({"success": result["valid"], "data": result}, status=code)


class WorkflowPublishView(APIView):
    permission_classes = [IsAuthenticated, require_permission("workflows.publish")]

    @extend_schema(summary="Publish Workflow Version")
    def post(self, request, workflow_id):
        restaurant = _restaurant(request)
        workflow = Workflow.objects.filter(
            Q(restaurant=restaurant) | Q(scope="GLOBAL", restaurant__isnull=True),
            id=workflow_id,
        ).first()
        if workflow is None:
            return Response({"success": False, "message": "Workflow not found."}, status=status.HTTP_404_NOT_FOUND)
        workflow = WorkflowService.publish(workflow, request.user, request.data.get("changelog", ""))
        return Response({"success": True, "data": WorkflowSerializer(workflow).data})


class WorkflowStateView(APIView):
    """Activate / pause / archive / resume a workflow."""

    permission_classes = [IsAuthenticated, require_permission("workflows.publish")]

    @extend_schema(summary="Change Workflow State")
    def post(self, request, workflow_id, action):
        restaurant = _restaurant(request)
        workflow = Workflow.objects.filter(
            Q(restaurant=restaurant) | Q(scope="GLOBAL", restaurant__isnull=True),
            id=workflow_id,
        ).first()
        if workflow is None:
            return Response({"success": False, "message": "Workflow not found."}, status=status.HTTP_404_NOT_FOUND)

        handlers = {
            "activate": WorkflowService.activate,
            "pause": WorkflowService.pause,
            "archive": WorkflowService.archive,
            "resume": WorkflowService.resume,
        }
        handler = handlers.get(action)
        if handler is None:
            return Response(
                {"success": False, "message": "Unknown action. Use activate, pause, archive or resume."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = handler(workflow, request.user)
        return Response({"success": True, "data": WorkflowSerializer(updated).data})


class WorkflowExecuteView(APIView):
    permission_classes = [IsAuthenticated, require_permission("workflows.execute")]

    @extend_schema(summary="Run Workflow Manually")
    def post(self, request, workflow_id):
        restaurant = _restaurant(request)
        workflow = Workflow.objects.filter(
            Q(restaurant=restaurant) | Q(scope="GLOBAL", restaurant__isnull=True),
            id=workflow_id,
        ).first()
        if workflow is None:
            return Response({"success": False, "message": "Workflow not found."}, status=status.HTTP_404_NOT_FOUND)
        execution = WorkflowExecutionService.execute_manually(
            workflow, request.user, request.data.get("input") or {}
        )
        return Response(
            {"success": True, "data": WorkflowExecutionSerializer(execution).data},
            status=status.HTTP_202_ACCEPTED,
        )


class WorkflowExecutionListView(APIView):
    def get_permissions(self):
        return [IsAuthenticated(), require_permission(WORKFLOW_PERMS)()]

    @extend_schema(summary="List Workflow Executions")
    def get(self, request):
        restaurant = _restaurant(request)
        queryset = WorkflowExecution.objects.filter(restaurant=restaurant).select_related(
            "workflow", "version", "restaurant", "triggered_by"
        )

        wf_status = request.query_params.get("status")
        if wf_status:
            queryset = queryset.filter(status=wf_status)

        workflow_id = request.query_params.get("workflow_id")
        if workflow_id:
            queryset = queryset.filter(workflow_id=workflow_id)

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(workflow__name__icontains=search) | Q(workflow__code__icontains=search)
            )

        return Response({"success": True, "data": WorkflowExecutionSerializer(queryset, many=True).data})


class WorkflowExecutionDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("workflows.cancel")()]
        return [IsAuthenticated(), require_permission(WORKFLOW_PERMS)()]

    def _get_execution(self, request, execution_id):
        restaurant = _restaurant(request)
        execution = WorkflowExecution.objects.filter(
            restaurant=restaurant, id=execution_id
        ).select_related("workflow", "version", "restaurant", "triggered_by", "parent_execution").first()
        if execution is None:
            raise ValueError("Execution not found or not accessible")
        return execution

    @extend_schema(summary="Retrieve Workflow Execution")
    def get(self, request, execution_id):
        execution = self._get_execution(request, execution_id)
        return Response({"success": True, "data": WorkflowExecutionSerializer(execution).data})

    @extend_schema(summary="Cancel Execution")
    def post(self, request, execution_id):
        execution = self._get_execution(request, execution_id)
        cancelled = WorkflowExecutionService.cancel(execution, request.user)
        return Response({"success": True, "data": WorkflowExecutionSerializer(cancelled).data})


class WorkflowExecutionActionView(APIView):
    """Retry, pause or resume an execution."""

    permission_classes = [IsAuthenticated, require_permission("workflows.cancel")]

    @extend_schema(summary="Execution Action (retry / pause / resume)")
    def post(self, request, execution_id, action):
        restaurant = _restaurant(request)
        execution = WorkflowExecution.objects.filter(restaurant=restaurant, id=execution_id).first()
        if execution is None:
            return Response({"success": False, "message": "Execution not found."}, status=status.HTTP_404_NOT_FOUND)

        handlers = {
            "retry": WorkflowExecutionService.retry,
            "pause": WorkflowExecutionService.pause_execution,
            "resume": WorkflowExecutionService.resume_execution,
        }
        handler = handlers.get(action)
        if handler is None:
            return Response(
                {"success": False, "message": "Unknown action. Use retry, pause or resume."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        updated = handler(execution, request.user)
        return Response({"success": True, "data": WorkflowExecutionSerializer(updated).data})


class WorkflowApprovalInboxView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission("workflows.approve")()]
        return [IsAuthenticated(), require_permission(WORKFLOW_PERMS)()]

    @extend_schema(summary="List Approval Requests (Inbox)")
    def get(self, request):
        restaurant = _restaurant(request)
        queryset = WorkflowApprovalRequest.objects.filter(
            execution__restaurant=restaurant
        ).select_related("execution", "execution__workflow", "requested_by", "approver", "responded_by")

        filter_status = request.query_params.get("status", "PENDING")
        if filter_status:
            queryset = queryset.filter(status=filter_status)

        from apps.rbac.models import TenantMembership

        membership = TenantMembership.objects.filter(
            tenant_id=restaurant.id,
            user=request.user,
            is_active=True,
        ).first()
        role_codes = []
        if membership:
            role_codes = list(
                membership.assigned_roles.filter(is_active=True).values_list("code", flat=True)
            )
            if membership.active_role_id and membership.active_role.is_active:
                role_codes.append(membership.active_role.code)
            role_codes.append("RESTAURANT_ADMIN")

        if role_codes:
            queryset = queryset.filter(
                Q(approver=request.user)
                | Q(approver_role__in=role_codes, approver__isnull=True)
                | Q(approver__isnull=True, approver_role="")
            )
        else:
            queryset = queryset.filter(
                Q(approver=request.user)
                | Q(approver__isnull=True, approver_role="")
            )

        return Response({"success": True, "data": WorkflowApprovalRequestSerializer(queryset, many=True).data})


class WorkflowApprovalRespondView(APIView):
    permission_classes = [IsAuthenticated, require_permission("workflows.approve")]

    @extend_schema(summary="Approve or Reject Approval Request")
    def post(self, request, approval_id, decision):
        restaurant = _restaurant(request)
        approval = WorkflowApprovalRequest.objects.filter(
            execution__restaurant=restaurant, id=approval_id
        ).first()
        if approval is None:
            return Response({"success": False, "message": "Approval request not found."}, status=status.HTTP_404_NOT_FOUND)

        note = request.data.get("note", "")
        try:
            if decision == "approve":
                updated = ApprovalService.approve(approval, request.user, note)
            elif decision == "reject":
                updated = ApprovalService.reject(approval, request.user, note)
            else:
                return Response(
                    {"success": False, "message": "Unknown decision. Use approve or reject."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"success": True, "data": WorkflowApprovalRequestSerializer(updated).data})


class WorkflowTemplateListView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission(WORKFLOW_MANAGE_PERMS)()]
        return [IsAuthenticated(), require_permission(WORKFLOW_PERMS)()]

    @extend_schema(summary="List Built-in Workflow Templates")
    def get(self, request):
        return Response({"success": True, "data": WorkflowTemplateService.list_templates()})

    @extend_schema(summary="Create Workflow from Template")
    def post(self, request):
        code = request.data.get("code")
        template = WorkflowTemplateService.get_template(code)
        if template is None:
            return Response({"success": False, "message": "Unknown template code."}, status=status.HTTP_404_NOT_FOUND)
        restaurant = _restaurant(request)
        scope = request.data.get("scope", "RESTAURANT")
        workflow = WorkflowTemplateService.instantiate(
            code=code,
            restaurant=restaurant if scope == "RESTAURANT" else None,
            user=request.user,
            name=request.data.get("name", ""),
        )
        return Response({"success": True, "data": WorkflowSerializer(workflow).data}, status=status.HTTP_201_CREATED)


class AutomationAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("automation.analytics.view")]

    @extend_schema(summary="Automation Analytics Overview")
    def get(self, request):
        restaurant = _restaurant(request)
        days = int(request.query_params.get("days", 30))
        data = AutomationAnalyticsService.overview(restaurant, days=days)
        return Response({"success": True, "data": data})


class WorkflowEventLogListView(APIView):
    permission_classes = [IsAuthenticated, require_permission(WORKFLOW_PERMS)]

    @extend_schema(summary="List Workflow Event Log")
    def get(self, request):
        restaurant = _restaurant(request)
        queryset = WorkflowEventLog.objects.filter(restaurant=restaurant).order_by("-occurred_at")

        event_type = request.query_params.get("event_type")
        if event_type:
            queryset = queryset.filter(event_type=event_type)

        entity_type = request.query_params.get("entity_type")
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)

        return Response({"success": True, "data": WorkflowEventLogSerializer(queryset, many=True).data})


class WorkflowTaskListView(APIView):
    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsAuthenticated(), require_permission(WORKFLOW_PERMS)()]
        return [IsAuthenticated(), require_permission(WORKFLOW_PERMS)()]

    @extend_schema(summary="List Workflow Tasks")
    def get(self, request):
        restaurant = _restaurant(request)
        queryset = WorkflowTask.objects.filter(restaurant=restaurant)

        task_status = request.query_params.get("status")
        if task_status:
            queryset = queryset.filter(status=task_status)

        assignee = request.query_params.get("assignee")
        if assignee:
            queryset = queryset.filter(assignee_id=assignee)

        return Response({"success": True, "data": WorkflowTaskSerializer(queryset, many=True).data})

    @extend_schema(summary="Update Workflow Task (status/assignee)")
    def patch(self, request, task_id=None):
        if task_id is None:
            return Response({"success": False, "message": "task_id required."}, status=status.HTTP_400_BAD_REQUEST)
        restaurant = _restaurant(request)
        task = WorkflowTask.objects.filter(restaurant=restaurant, id=task_id).first()
        if task is None:
            return Response({"success": False, "message": "Task not found."}, status=status.HTTP_404_NOT_FOUND)
        for field in ("status", "priority", "title", "description", "due_at"):
            if field in request.data:
                setattr(task, field, request.data[field])
        task.save()
        return Response({"success": True, "data": WorkflowTaskSerializer(task).data})


class WorkflowWebhookCredentialListView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), require_permission(WORKFLOW_MANAGE_PERMS)()]
        return [IsAuthenticated(), require_permission(WORKFLOW_PERMS)()]

    @extend_schema(summary="List Webhook Credentials (references only)")
    def get(self, request):
        restaurant = _restaurant(request)
        queryset = WorkflowWebhookCredential.objects.filter(restaurant=restaurant)
        return Response({"success": True, "data": WorkflowWebhookCredentialSerializer(queryset, many=True).data})

    @extend_schema(summary="Register Webhook Credential Reference")
    def post(self, request):
        restaurant = _restaurant(request)
        serializer = WorkflowWebhookCredentialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        credential = WorkflowWebhookCredential.objects.create(
            restaurant=restaurant,
            name=serializer.validated_data["name"],
            reference_key=serializer.validated_data["reference_key"],
            endpoint_url=serializer.validated_data["endpoint_url"],
            auth_type=serializer.validated_data.get("auth_type", "NONE"),
            is_active=serializer.validated_data.get("is_active", True),
        )
        return Response(
            {"success": True, "data": WorkflowWebhookCredentialSerializer(credential).data},
            status=status.HTTP_201_CREATED,
        )