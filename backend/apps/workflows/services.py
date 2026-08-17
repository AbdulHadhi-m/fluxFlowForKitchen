"""
Workflow domain services: lifecycle management, execution orchestration,
approvals, templates and automation analytics.
"""
import logging
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.workflows.models import (
    ApprovalStatus,
    ExecutionStatus,
    StepExecutionStatus,
    StepType,
    Workflow,
    WorkflowApprovalRequest,
    WorkflowExecution,
    WorkflowStepExecution,
    WorkflowStatus,
    WorkflowTriggerType,
    WorkflowVersion,
)
from apps.workflows.actions import ActionRegistry
from apps.workflows.conditions import validate_condition_spec
from apps.workflows.engine.runner import WorkflowEngine

logger = logging.getLogger("fluxiflow.workflows.services")


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

VALID_TRIGGER_EVENTS = (
    "ORDER_CREATED", "ORDER_COMPLETED", "ORDER_CANCELLED",
    "PAYMENT_COMPLETED", "PAYMENT_FAILED", "BILL_VOIDED", "INVOICE_OVERDUE",
    "INVENTORY_LOW", "INVENTORY_OUT",
    "PURCHASE_ORDER_CREATED", "PURCHASE_ORDER_RECEIVED",
    "CUSTOMER_CREATED", "CUSTOMER_FEEDBACK_SUBMITTED", "COMPLAINT_CREATED",
    "TICKET_CREATED", "TICKET_SLA_BREACHED",
    "RESERVATION_CREATED", "RESERVATION_CANCELLED",
    "EMPLOYEE_ABSENCE_RECORDED", "PAYROLL_COMPLETED", "CAMPAIGN_COMPLETED",
)

VALID_STEP_TYPES = tuple(StepType.values)


class WorkflowValidator:
    """Validates workflow definitions before publishing."""

    @staticmethod
    def validate_workflow(workflow: Workflow, definition: Dict[str, Any]) -> List[str]:
        errors: List[str] = []

        trigger_type = workflow.trigger_type
        trigger_config = workflow.trigger_config or {}

        if not workflow.code or not workflow.name:
            errors.append("Workflow requires a name and a code.")

        if trigger_type == WorkflowTriggerType.EVENT:
            event_types = trigger_config.get("event_types") or []
            if not event_types:
                errors.append("EVENT workflows must declare at least one event_types entry.")
            for event_type in event_types:
                if event_type not in VALID_TRIGGER_EVENTS:
                    errors.append(f"Unknown event type: {event_type}")
        elif trigger_type == WorkflowTriggerType.SCHEDULE:
            schedule = trigger_config.get("schedule") or {}
            if not schedule.get("cron") and not schedule.get("interval"):
                errors.append("SCHEDULE workflows require a schedule.cron or schedule.interval value.")
        elif trigger_type == WorkflowTriggerType.WEBHOOK:
            if not trigger_config.get("path"):
                errors.append("WEBHOOK workflows require trigger_config.path.")

        # Conditions
        conditions = workflow.conditions or {}
        if conditions:
            errors.extend(validate_condition_spec(conditions))

        # Steps
        steps = definition.get("steps") or []
        if not steps:
            errors.append("Workflow definition must contain at least one step.")

        codes = []
        has_end = False
        for i, step in enumerate(steps):
            step_code = str(step.get("code", "")).strip()
            if not step_code:
                errors.append(f"Step {i}: missing code")
                continue
            if step_code in codes:
                errors.append(f"Duplicate step code: {step_code}")
            codes.append(step_code)
            step_type = step.get("type")
            if step_type not in VALID_STEP_TYPES:
                errors.append(f"Step '{step_code}': invalid type '{step_type}'")
            if step_type == StepType.ACTION:
                action = (step.get("config") or {}).get("action") or (step.get("config") or {}).get("action_code")
                if not action:
                    errors.append(f"Step '{step_code}': ACTION step missing config.action")
                else:
                    try:
                        ActionRegistry.get(action)
                    except Exception:
                        errors.append(f"Step '{step_code}': unknown action '{action}'")
            if step_type == StepType.APPROVAL:
                config = step.get("config") or {}
                if not config.get("approver_id") and not config.get("approver_role"):
                    errors.append(f"Step '{step_code}': APPROVAL step requires approver_id or approver_role")
            if step_type == StepType.WAIT:
                config = step.get("config") or {}
                if not config.get("duration_seconds") and not config.get("until"):
                    errors.append(f"Step '{step_code}': WAIT step requires duration_seconds or until")
            if step_type == StepType.BRANCH:
                config = step.get("config") or {}
                if not config.get("branches") and not config.get("default_target"):
                    errors.append(f"Step '{step_code}': BRANCH step requires branches or default_target")
            if step_type == StepType.END:
                has_end = True

            step_conditions = step.get("conditions") or {}
            if step_conditions:
                errors.extend(validate_condition_spec(step_conditions))

            # Validate branch targets reference existing steps
            if step_type == StepType.BRANCH:
                for branch in (step.get("config") or {}).get("branches") or []:
                    target = branch.get("target")
                    if target and target not in codes and target != "__END__":
                        errors.append(f"Step '{step_code}': branch target '{target}' does not exist")
                default_target = (step.get("config") or {}).get("default_target")
                if default_target and default_target not in codes and default_target != "__END__":
                    errors.append(f"Step '{step_code}': default target '{default_target}' does not exist")

        if not has_end and not (steps and steps[-1].get("type") == StepType.END):
            errors.append("Workflow must include an END step (or end-of-list implicit end is acceptable).")

        return errors


# ---------------------------------------------------------------------------
# Workflow lifecycle service
# ---------------------------------------------------------------------------

class WorkflowService:
    """CRUD, validation, publishing, activation, pausing and archiving."""

    @staticmethod
    def create_workflow(
        restaurant: Optional[Restaurant],
        user: User,
        data: Dict[str, Any],
    ) -> Workflow:
        with transaction.atomic():
            workflow = Workflow(
                name=data.get("name", "").strip(),
                code=data.get("code", "").strip().upper().replace(" ", "_"),
                description=data.get("description", ""),
                category=data.get("category", "OPERATIONS"),
                trigger_type=data.get("trigger_type", WorkflowTriggerType.EVENT),
                trigger_config=data.get("trigger_config") or {},
                status=WorkflowStatus.DRAFT,
                scope=data.get("scope", "RESTAURANT"),
                restaurant=restaurant,
                branch_id=data.get("branch_id"),
                conditions=data.get("conditions") or {},
                timeout_minutes=data.get("timeout_minutes") or 120,
                max_steps=data.get("max_steps") or 50,
                max_retries=data.get("max_retries") or 3,
                max_nested_depth=data.get("max_nested_depth") or 3,
                created_by=user,
                updated_by=user,
            )
            workflow.full_clean(exclude=["active_version"])
            workflow.save()

            definition = {
                "steps": data.get("steps") or [],
                "conditions": data.get("conditions") or {},
            }
            version = WorkflowVersion.objects.create(
                workflow=workflow,
                version_number=1,
                definition=definition,
                status=WorkflowVersion.VersionStatus.DRAFT,
                created_by=user,
            )
            workflow.version_count = 1
            workflow.save(update_fields=["version_count"])

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=restaurant,
                action=AuditAction.CREATE,
                entity_type="WORKFLOW",
                entity_id=str(workflow.id),
                actor=user,
                description=f"Created workflow '{workflow.name}' ({workflow.code})",
            )
            return workflow

    @staticmethod
    def update_workflow(workflow: Workflow, user: User, data: Dict[str, Any]) -> Workflow:
        with transaction.atomic():
            editable = ("name", "description", "category", "trigger_type", "trigger_config",
                        "scope", "branch_id", "conditions", "timeout_minutes", "max_steps",
                        "max_retries", "max_nested_depth")
            before = {
                "status": workflow.status,
                "trigger_type": workflow.trigger_type,
            }
            for field in editable:
                if field in data:
                    setattr(workflow, field, data[field])
            workflow.updated_by = user
            workflow.full_clean(exclude=["active_version", "code"])
            workflow.save()

            if workflow.status == WorkflowStatus.DRAFT and "steps" in data:
                # Update the draft version in place; published versions stay frozen
                draft_version = (
                    workflow.versions.filter(status=WorkflowVersion.VersionStatus.DRAFT)
                    .order_by("-version_number")
                    .first()
                )
                if draft_version:
                    definition = dict(draft_version.definition or {})
                    definition["steps"] = data["steps"]
                    if "conditions" in data:
                        definition["conditions"] = data["conditions"]
                    draft_version.definition = definition
                    draft_version.save(update_fields=["definition", "updated_at"])

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=workflow.restaurant,
                action=AuditAction.UPDATE,
                entity_type="WORKFLOW",
                entity_id=str(workflow.id),
                actor=user,
                description=f"Updated workflow '{workflow.name}'",
                before_data=before,
                after_data={"status": workflow.status, "trigger_type": workflow.trigger_type},
            )
            return workflow

    @staticmethod
    def validate(workflow: Workflow) -> Dict[str, Any]:
        definition = workflow.active_version.definition if workflow.active_version_id else (
            workflow.versions.filter(status=WorkflowVersion.VersionStatus.DRAFT).order_by("-version_number").first().definition
            if workflow.versions.exists() else {"steps": []}
        )
        errors = WorkflowValidator.validate_workflow(workflow, definition)
        return {"valid": not errors, "errors": errors}

    @staticmethod
    def publish(workflow: Workflow, user: User, changelog: str = "") -> Workflow:
        with transaction.atomic():
            workflow = Workflow.objects.select_for_update().get(id=workflow.id)
            draft = (
                workflow.versions.filter(status=WorkflowVersion.VersionStatus.DRAFT)
                .order_by("-version_number")
                .first()
            )
            if draft is None:
                # Create a new draft version snapshot of the current definition
                latest = workflow.active_version or workflow.versions.order_by("-version_number").first()
                definition = latest.definition if latest else {"steps": []}
                draft = WorkflowVersion.objects.create(
                    workflow=workflow,
                    version_number=workflow.version_count + 1,
                    definition=definition,
                    status=WorkflowVersion.VersionStatus.DRAFT,
                    created_by=user,
                )
                workflow.version_count = draft.version_number

            errors = WorkflowValidator.validate_workflow(workflow, draft.definition or {})
            if errors:
                raise ValidationError({"detail": "Workflow validation failed", "errors": errors})

            # Supersede previously published versions
            workflow.versions.filter(status=WorkflowVersion.VersionStatus.PUBLISHED).update(
                status=WorkflowVersion.VersionStatus.SUPERSEDED
            )

            draft.status = WorkflowVersion.VersionStatus.PUBLISHED
            draft.published_by = user
            draft.published_at = timezone.now()
            draft.changelog = changelog
            draft.save(update_fields=["status", "published_by", "published_at", "changelog", "updated_at"])

            workflow.active_version = draft
            workflow.version_count = draft.version_number
            workflow.status = WorkflowStatus.DRAFT if workflow.status == WorkflowStatus.DRAFT else workflow.status
            workflow.save(update_fields=["active_version", "version_count", "updated_at"])

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=workflow.restaurant,
                action=AuditAction.APPROVED,
                entity_type="WORKFLOW",
                entity_id=str(workflow.id),
                actor=user,
                description=f"Published workflow '{workflow.name}' v{draft.version_number}",
            )
            return workflow

    @staticmethod
    def activate(workflow: Workflow, user: User) -> Workflow:
        with transaction.atomic():
            workflow = Workflow.objects.select_for_update().get(id=workflow.id)
            if not workflow.active_version_id:
                raise ValidationError({"detail": "Workflow must be published before activation."})
            workflow.status = WorkflowStatus.ACTIVE
            workflow.updated_by = user
            workflow.save(update_fields=["status", "updated_by", "updated_at"])

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=workflow.restaurant,
                action=AuditAction.STATUS_CHANGED,
                entity_type="WORKFLOW",
                entity_id=str(workflow.id),
                actor=user,
                description=f"Activated workflow '{workflow.name}'",
                after_data={"status": WorkflowStatus.ACTIVE},
            )
            return workflow

    @staticmethod
    def pause(workflow: Workflow, user: User) -> Workflow:
        with transaction.atomic():
            workflow = Workflow.objects.select_for_update().get(id=workflow.id)
            if workflow.status != WorkflowStatus.ACTIVE:
                raise ValidationError({"detail": "Only ACTIVE workflows can be paused."})
            workflow.status = WorkflowStatus.PAUSED
            workflow.updated_by = user
            workflow.save(update_fields=["status", "updated_by", "updated_at"])

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=workflow.restaurant,
                action=AuditAction.STATUS_CHANGED,
                entity_type="WORKFLOW",
                entity_id=str(workflow.id),
                actor=user,
                description=f"Paused workflow '{workflow.name}'",
                after_data={"status": WorkflowStatus.PAUSED},
            )
            return workflow

    @staticmethod
    def resume(workflow: Workflow, user: User) -> Workflow:
        with transaction.atomic():
            workflow = Workflow.objects.select_for_update().get(id=workflow.id)
            if workflow.status != WorkflowStatus.PAUSED:
                raise ValidationError({"detail": "Only PAUSED workflows can be resumed."})
            workflow.status = WorkflowStatus.ACTIVE
            workflow.updated_by = user
            workflow.save(update_fields=["status", "updated_by", "updated_at"])

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=workflow.restaurant,
                action=AuditAction.STATUS_CHANGED,
                entity_type="WORKFLOW",
                entity_id=str(workflow.id),
                actor=user,
                description=f"Resumed workflow '{workflow.name}'",
                after_data={"status": WorkflowStatus.ACTIVE},
            )
            return workflow

    @staticmethod
    def archive(workflow: Workflow, user: User) -> Workflow:
        with transaction.atomic():
            workflow = Workflow.objects.select_for_update().get(id=workflow.id)
            workflow.status = WorkflowStatus.ARCHIVED
            workflow.updated_by = user
            workflow.save(update_fields=["status", "updated_by", "updated_at"])

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=workflow.restaurant,
                action=AuditAction.DELETE,
                entity_type="WORKFLOW",
                entity_id=str(workflow.id),
                actor=user,
                description=f"Archived workflow '{workflow.name}'",
                after_data={"status": WorkflowStatus.ARCHIVED},
            )
            return workflow


# ---------------------------------------------------------------------------
# Execution service
# ---------------------------------------------------------------------------

class WorkflowExecutionService:
    """Starts, cancels, retries, pauses and resumes workflow executions."""

    @staticmethod
    def start_execution(
        workflow: Workflow,
        trigger: str,
        input_data: Dict[str, Any],
        user: Optional[User] = None,
        event_id: str = "",
        parent_execution: Optional[WorkflowExecution] = None,
    ) -> WorkflowExecution:
        with transaction.atomic():
            version = workflow.active_version
            if version is None:
                raise ValidationError({"detail": "Workflow has no published version."})

            restaurant = workflow.restaurant
            if restaurant is None and input_data.get("restaurant_id"):
                restaurant = Restaurant.objects.filter(id=input_data["restaurant_id"]).first()
            if restaurant is None:
                raise ValidationError({"detail": "Unable to resolve restaurant scope."})

            depth = 0
            if parent_execution is not None:
                depth = parent_execution.depth + 1
                if depth > (workflow.max_nested_depth or 3):
                    raise ValidationError({"detail": "Maximum nested workflow depth exceeded."})

            execution = WorkflowExecution.objects.create(
                workflow=workflow,
                version=version,
                restaurant=restaurant,
                status=ExecutionStatus.PENDING,
                trigger=trigger,
                event_id=event_id,
                input=input_data or {},
                scheduled_at=timezone.now() if trigger == "SCHEDULE" else None,
                parent_execution=parent_execution,
                depth=depth,
                triggered_by=user,
            )

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=restaurant,
                action=AuditAction.CREATE,
                entity_type="WORKFLOW_EXECUTION",
                entity_id=str(execution.id),
                actor=user,
                actor_type="SYSTEM" if not user else "USER",
                description=f"Started execution of workflow '{workflow.name}' ({trigger})",
                metadata={"event_id": event_id, "workflow_code": workflow.code},
            )

            from apps.workflows.tasks import run_workflow_execution
            run_workflow_execution.delay(str(execution.id))
            return execution

    @staticmethod
    def execute_manually(workflow: Workflow, user: User, input_data: Dict[str, Any]) -> WorkflowExecution:
        """Manual execution requires an ACTIVE workflow and input data."""
        if workflow.status != WorkflowStatus.ACTIVE:
            raise ValidationError({"detail": "Only ACTIVE workflows can be executed manually."})
        return WorkflowExecutionService.start_execution(
            workflow=workflow,
            trigger="MANUAL",
            input_data=input_data or {},
            user=user,
        )

    @staticmethod
    def run_now(execution_id: str) -> str:
        """Executes (or resumes) an execution in-process via the engine."""
        engine = WorkflowEngine(execution_id)
        return engine.run()

    @staticmethod
    def cancel(execution: WorkflowExecution, user: User) -> WorkflowExecution:
        with transaction.atomic():
            execution = WorkflowExecution.objects.select_for_update().get(id=execution.id)
            if execution.status in (ExecutionStatus.COMPLETED, ExecutionStatus.CANCELLED):
                raise ValidationError({"detail": f"Cannot cancel an execution in status {execution.status}."})
            execution.status = ExecutionStatus.CANCELLED
            execution.completed_at = timezone.now()
            execution.save(update_fields=["status", "completed_at", "updated_at"])

            execution.approval_requests.filter(status=ApprovalStatus.PENDING).update(
                status=ApprovalStatus.CANCELLED,
                responded_at=timezone.now(),
            )

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=execution.restaurant,
                action=AuditAction.CANCELLED,
                entity_type="WORKFLOW_EXECUTION",
                entity_id=str(execution.id),
                actor=user,
                description=f"Cancelled workflow execution {execution.id}",
            )
            return execution

    @staticmethod
    def pause_execution(execution: WorkflowExecution, user: User) -> WorkflowExecution:
        with transaction.atomic():
            execution = WorkflowExecution.objects.select_for_update().get(id=execution.id)
            if execution.status not in (ExecutionStatus.RUNNING, ExecutionStatus.PENDING, ExecutionStatus.WAITING):
                raise ValidationError({"detail": f"Cannot pause execution in status {execution.status}."})
            execution.is_paused = True
            execution.status = ExecutionStatus.PAUSED
            execution.save(update_fields=["is_paused", "status", "updated_at"])

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=execution.restaurant,
                action=AuditAction.STATUS_CHANGED,
                entity_type="WORKFLOW_EXECUTION",
                entity_id=str(execution.id),
                actor=user,
                description=f"Paused workflow execution {execution.id}",
                after_data={"status": ExecutionStatus.PAUSED},
            )
            return execution

    @staticmethod
    def resume_execution(execution: WorkflowExecution, user: User) -> WorkflowExecution:
        with transaction.atomic():
            execution = WorkflowExecution.objects.select_for_update().get(id=execution.id)
            if not execution.is_paused or execution.status != ExecutionStatus.PAUSED:
                raise ValidationError({"detail": "Execution is not paused."})
            execution.is_paused = False
            execution.status = ExecutionStatus.RUNNING
            execution.save(update_fields=["is_paused", "status", "updated_at"])

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=execution.restaurant,
                action=AuditAction.STATUS_CHANGED,
                entity_type="WORKFLOW_EXECUTION",
                entity_id=str(execution.id),
                actor=user,
                description=f"Resumed workflow execution {execution.id}",
                after_data={"status": ExecutionStatus.RUNNING},
            )

            from apps.workflows.tasks import run_workflow_execution
            run_workflow_execution.delay(str(execution.id))
            return execution

    @staticmethod
    def retry(execution: WorkflowExecution, user: User) -> WorkflowExecution:
        """Manual retry of a failed execution. Completed irreversible steps are never re-run."""
        with transaction.atomic():
            execution = WorkflowExecution.objects.select_for_update().get(id=execution.id)
            if execution.status not in (ExecutionStatus.FAILED, ExecutionStatus.CANCELLED):
                raise ValidationError({"detail": f"Cannot retry execution in status {execution.status}."})

            # Re-anchor to the failed step
            failed_step = execution.error.get("step", "")
            execution.status = ExecutionStatus.PENDING
            execution.current_step_code = failed_step
            execution.error = {}
            execution.started_at = None
            execution.completed_at = None
            execution.attempt_count += 1
            execution.is_paused = False
            execution.save(
                update_fields=[
                    "status", "current_step_code", "error", "started_at",
                    "completed_at", "attempt_count", "is_paused", "updated_at",
                ]
            )

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=execution.restaurant,
                action=AuditAction.UPDATE,
                entity_type="WORKFLOW_EXECUTION",
                entity_id=str(execution.id),
                actor=user,
                description=f"Manually retried workflow execution {execution.id}",
            )

            from apps.workflows.tasks import run_workflow_execution
            run_workflow_execution.delay(str(execution.id))
            return execution


# ---------------------------------------------------------------------------
# Approval service
# ---------------------------------------------------------------------------

class ApprovalService:
    """Human approval gates with RBAC enforcement, expiry and escalation."""

    @staticmethod
    def request_approval(
        execution: WorkflowExecution,
        step_code: str,
        requested_by: Optional[User],
        approver_id: Optional[str],
        approver_role: str,
        reason: str,
        amount: Decimal,
        entity_type: str,
        entity_id: str,
        related_data: Dict[str, Any],
        expiry_hours: Optional[int],
    ) -> WorkflowApprovalRequest:
        from apps.rbac.models import Role

        approver = None
        if approver_id:
            from apps.accounts.models import User
            approver = User.objects.filter(id=approver_id).first()
            if approver is None:
                raise ValidationError({"detail": "Configured approver does not exist."})

        if approver is None and not approver_role:
            approver_role = "RESTAURANT_ADMIN"

        if approver_role:
            role = Role.objects.filter(code=approver_role).first()
            if role is None:
                raise ValidationError({"detail": f"Approver role '{approver_role}' does not exist."})

        expires_at = None
        if expiry_hours:
            expires_at = timezone.now() + timezone.timedelta(hours=int(expiry_hours))

        request = WorkflowApprovalRequest.objects.create(
            execution=execution,
            step_code=step_code,
            requested_by=requested_by,
            approver=approver,
            approver_role=approver_role,
            reason=reason,
            amount=amount,
            entity_type=entity_type,
            entity_id=entity_id,
            related_data=related_data or {},
            status=ApprovalStatus.PENDING,
            expires_at=expires_at,
        )

        from apps.notifications.services import NotificationService
        from apps.notifications.models import NotificationType, NotificationSeverity
        from apps.rbac.models import TenantMembership

        if approver is not None:
            NotificationService.create_notification(
                restaurant=execution.restaurant,
                recipient=approver,
                notification_type=NotificationType.WORKFLOW_APPROVAL_REQUESTED,
                title="Approval Requested",
                message=f"Workflow '{execution.workflow.name}' requires your approval{f': {reason}' if reason else ''} (${amount}).",
                severity=NotificationSeverity.WARNING,
                action_url=f"/automation/approvals",
                entity_type="WORKFLOW_APPROVAL",
                entity_id=str(request.id),
                deduplication_key=f"wf-approval:{request.id}",
            )
        else:
            recipients = (
                TenantMembership.objects.filter(
                    tenant_id=execution.restaurant_id,
                    is_active=True,
                    user__is_active=True,
                )
                .filter(
                    _models_Q(active_role__code=approver_role)
                    | _models_Q(assigned_roles__code=approver_role)
                    | _models_Q(active_role__code="RESTAURANT_ADMIN")
                    | _models_Q(assigned_roles__code="RESTAURANT_ADMIN")
                )
                .select_related("user")
                .distinct()
            )
            for membership in recipients:
                NotificationService.create_notification(
                    restaurant=execution.restaurant,
                    recipient=membership.user,
                    notification_type=NotificationType.WORKFLOW_APPROVAL_REQUESTED,
                    title="Approval Requested",
                    message=f"Workflow '{execution.workflow.name}' requires {approver_role} approval{f': {reason}' if reason else ''} (${amount}).",
                    severity=NotificationSeverity.WARNING,
                    action_url="/automation/approvals",
                    entity_type="WORKFLOW_APPROVAL",
                    entity_id=str(request.id),
                    deduplication_key=f"wf-approval:{request.id}:{membership.user_id}",
                )

        from apps.audit.services import AuditService
        from apps.audit.models import AuditAction
        AuditService.log(
            restaurant=execution.restaurant,
            action=AuditAction.CREATE,
            entity_type="WORKFLOW_APPROVAL",
            entity_id=str(request.id),
            actor=requested_by,
            description=f"Approval requested for execution {execution.id} step {step_code}",
            metadata={"amount": str(amount), "approver_role": approver_role},
        )
        return request

    @staticmethod
    def _has_approval_permission(request: WorkflowApprovalRequest, user: User) -> bool:
        from apps.rbac.models import TenantMembership

        if not user or not user.is_authenticated:
            return False

        # Direct assignee
        if request.approver_id and request.approver_id == user.id:
            return True

        # Role based via tenant membership (active or assigned roles)
        role_codes = [request.approver_role] if request.approver_role else []
        if request.approver_role:
            return TenantMembership.objects.filter(
                tenant_id=request.execution.restaurant_id,
                user=user,
                is_active=True,
            ).filter(
                _models_Q(active_role__code__in=role_codes)
                | _models_Q(assigned_roles__code__in=role_codes)
                | _models_Q(active_role__code="RESTAURANT_ADMIN")
                | _models_Q(assigned_roles__code="RESTAURANT_ADMIN")
            ).exists()
        return False

    @staticmethod
    def approve(request: WorkflowApprovalRequest, user: User, note: str = "") -> WorkflowApprovalRequest:
        with transaction.atomic():
            request = WorkflowApprovalRequest.objects.select_for_update().get(id=request.id)
            if request.status != ApprovalStatus.PENDING:
                raise ValidationError({"detail": f"Approval is already {request.status}."})

            # Separation of duties: the requester may not approve their own restricted approval
            if request.requested_by_id and request.requested_by_id == user.id:
                raise ValidationError({"detail": "You cannot approve an approval you requested."})
            if not ApprovalService._has_approval_permission(request, user):
                raise ValidationError({"detail": "You do not have permission to approve this request."})

            request.status = ApprovalStatus.APPROVED
            request.responded_at = timezone.now()
            request.responded_by = user
            request.response_note = note
            request.save(
                update_fields=["status", "responded_at", "responded_by", "response_note", "updated_at"]
            )

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=request.execution.restaurant,
                action=AuditAction.APPROVED,
                entity_type="WORKFLOW_APPROVAL",
                entity_id=str(request.id),
                actor=user,
                description=f"Approved workflow approval {request.id}",
            )

            engine = WorkflowEngine(str(request.execution_id))
            execution = WorkflowExecution.objects.get(id=request.execution_id)
            engine.resume_after_approval(execution, request)
            return request

    @staticmethod
    def reject(request: WorkflowApprovalRequest, user: User, note: str = "") -> WorkflowApprovalRequest:
        with transaction.atomic():
            request = WorkflowApprovalRequest.objects.select_for_update().get(id=request.id)
            if request.status != ApprovalStatus.PENDING:
                raise ValidationError({"detail": f"Approval is already {request.status}."})
            if request.requested_by_id and request.requested_by_id == user.id:
                raise ValidationError({"detail": "You cannot reject an approval you requested."})
            if not ApprovalService._has_approval_permission(request, user):
                raise ValidationError({"detail": "You do not have permission to reject this request."})

            request.status = ApprovalStatus.REJECTED
            request.responded_at = timezone.now()
            request.responded_by = user
            request.response_note = note
            request.save(
                update_fields=["status", "responded_at", "responded_by", "response_note", "updated_at"]
            )

            from apps.audit.services import AuditService
            from apps.audit.models import AuditAction
            AuditService.log(
                restaurant=request.execution.restaurant,
                action=AuditAction.CANCELLED,
                entity_type="WORKFLOW_APPROVAL",
                entity_id=str(request.id),
                actor=user,
                description=f"Rejected workflow approval {request.id}",
            )

            engine = WorkflowEngine(str(request.execution_id))
            execution = WorkflowExecution.objects.get(id=request.execution_id)
            engine.resume_after_approval(execution, request)
            return request

    @staticmethod
    def expire_overdue() -> int:
        """Expires PENDING approvals past their expiry and triggers configured escalation."""
        from apps.notifications.services import NotificationService
        from apps.notifications.models import NotificationType, NotificationSeverity

        now = timezone.now()
        expired = list(
            WorkflowApprovalRequest.objects.filter(
                status=ApprovalStatus.PENDING,
                expires_at__isnull=False,
                expires_at__lt=now,
            )
        )
        count = 0
        for request in expired:
            with transaction.atomic():
                request = WorkflowApprovalRequest.objects.select_for_update().get(id=request.id)
                if request.status != ApprovalStatus.PENDING:
                    continue
                request.status = ApprovalStatus.EXPIRED
                request.responded_at = now
                request.escalation_count += 1
                request.escalated_at = now
                request.save(
                    update_fields=["status", "responded_at", "escalation_count", "escalated_at", "updated_at"]
                )

                NotificationService.notify_users_with_permission(
                    restaurant=request.execution.restaurant,
                    permission_code="settings.manage",
                    notification_type=NotificationType.WORKFLOW_APPROVAL_ESCALATED,
                    title="Approval Escalated (Expired)",
                    message=(
                        f"Approval for workflow '{request.execution.workflow.name}' expired "
                        f"(${request.amount}) and has been escalated."
                    ),
                    severity=NotificationSeverity.CRITICAL,
                    entity_type="WORKFLOW_APPROVAL",
                    entity_id=str(request.id),
                    deduplication_key_prefix=f"wf-approval-expired:{request.id}",
                )
                count += 1

        return count


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

class WorkflowTemplateService:
    """Built-in workflow templates using only existing domain services."""

    TEMPLATES: List[Dict[str, Any]] = [
        {
            "code": "LOW_STOCK_REORDER",
            "name": "Low Stock Reorder",
            "description": "When inventory drops below its reorder point, create a purchase requisition and notify the purchasing manager.",
            "category": "INVENTORY",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["INVENTORY_LOW"]},
            "conditions": {
                "operator": "AND",
                "conditions": [
                    {"field": "payload.is_active", "operator": "EQUALS", "value": True},
                ],
            },
            "steps": [
                {"code": "create_requisition", "name": "Create Purchase Requisition", "type": "ACTION",
                 "config": {"action": "CREATE_PURCHASE_REQUEST",
                            "items": [{"inventory_item_id": "{{payload.item_id}}",
                                       "quantity_requested": "{{payload.par_level}}"}],
                            "reason": "Automated low stock reorder"}},
                {"code": "notify_manager", "name": "Notify Purchasing Manager", "type": "ACTION",
                 "config": {"action": "SEND_NOTIFICATION", "permission_code": "procurement.requisition.approve",
                            "title": "Low Stock Reorder Created", "message": "A purchase requisition was auto-created for low stock items."}},
                {"code": "end", "name": "End", "type": "END", "config": {}},
            ],
        },
        {
            "code": "OVERDUE_INVOICE_REMINDER",
            "name": "Overdue Invoice Reminder",
            "description": "Sends a reminder notification when an invoice becomes overdue.",
            "category": "FINANCE",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["INVOICE_OVERDUE"]},
            "steps": [
                {"code": "notify_finance", "name": "Notify Finance Team", "type": "ACTION",
                 "config": {"action": "SEND_NOTIFICATION", "permission_code": "finance.view",
                            "title": "Invoice Overdue", "message": "An invoice is now overdue. Review and follow up."}},
                {"code": "create_followup", "name": "Create Follow-up Task", "type": "ACTION",
                 "config": {"action": "CREATE_FOLLOW_UP", "days": 1, "title": "Follow up overdue invoice",
                            "assignee_role": "RESTAURANT_ADMIN"}},
                {"code": "end", "name": "End", "type": "END", "config": {}},
            ],
        },
        {
            "code": "PAYMENT_FAILED_ALERT",
            "name": "Payment Failed Alert",
            "description": "Alerts staff and creates a recovery task when a payment fails.",
            "category": "PAYMENT",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["PAYMENT_FAILED"]},
            "steps": [
                {"code": "notify_cashier", "name": "Notify Cashier Team", "type": "ACTION",
                 "config": {"action": "SEND_NOTIFICATION", "permission_code": "billing.view",
                            "title": "Payment Failed", "message": "A payment attempt failed. Verify and retry."}},
                {"code": "create_task", "name": "Create Recovery Task", "type": "ACTION",
                 "config": {"action": "CREATE_TASK", "title": "Recover failed payment", "priority": "HIGH"}},
                {"code": "end", "name": "End", "type": "END", "config": {}},
            ],
        },
        {
            "code": "SUPPORT_SLA_ESCALATION",
            "name": "Support SLA Escalation",
            "description": "Escalates open support tickets that breach their SLA.",
            "category": "SUPPORT",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["TICKET_SLA_BREACHED"]},
            "steps": [
                {"code": "escalate", "name": "Escalate Ticket", "type": "ACTION",
                 "config": {"action": "ESCALATE", "title": "SLA Breached", "message": "A support ticket has breached its SLA."}},
                {"code": "end", "name": "End", "type": "END", "config": {}},
            ],
        },
        {
            "code": "CUSTOMER_FEEDBACK_FOLLOW_UP",
            "name": "Customer Feedback Follow-up",
            "description": "Follows up with customers who submitted feedback after a dining visit.",
            "category": "CUSTOMER",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["CUSTOMER_FEEDBACK_SUBMITTED"]},
            "steps": [
                {"code": "wait", "name": "Wait 1 Day", "type": "WAIT", "config": {"duration_seconds": 86400}},
                {"code": "followup", "name": "Create Follow-up", "type": "ACTION",
                 "config": {"action": "CREATE_FOLLOW_UP", "title": "Customer feedback follow-up", "category": "CUSTOMER"}},
                {"code": "end", "name": "End", "type": "END", "config": {}},
            ],
        },
        {
            "code": "LARGE_REFUND_APPROVAL",
            "name": "Large Refund Approval",
            "description": "Requests managerial approval before processing refunds above a configured threshold.",
            "category": "FINANCE",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["PAYMENT_FAILED"]},
            "conditions": {"field": "payload.refund_amount", "operator": "GREATER_THAN", "value": 500},
            "steps": [
                {"code": "approve", "name": "Manager Approval", "type": "APPROVAL",
                 "config": {"approver_role": "MANAGER", "amount": "{{payload.refund_amount}}",
                            "reason": "Refund above threshold requires approval", "expiry_hours": 24}},
                {"code": "notify", "name": "Notify Requester", "type": "ACTION",
                 "config": {"action": "SEND_NOTIFICATION", "title": "Refund Approved", "message": "Your refund request has been approved."}},
                {"code": "end", "name": "End", "type": "END", "config": {}},
            ],
        },
        {
            "code": "LARGE_PURCHASE_APPROVAL",
            "name": "Large Purchase Approval",
            "description": "Requests approval before large purchase orders are sent to suppliers.",
            "category": "PROCUREMENT",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["PURCHASE_ORDER_CREATED"]},
            "conditions": {"field": "payload.total_amount", "operator": "GREATER_THAN", "value": 5000},
            "steps": [
                {"code": "approve", "name": "Purchase Approval", "type": "APPROVAL",
                 "config": {"approver_role": "RESTAURANT_ADMIN",
                            "amount": "{{payload.total_amount}}", "reason": "Large purchase order", "expiry_hours": 48}},
                {"code": "notify", "name": "Notify Procurement", "type": "ACTION",
                 "config": {"action": "SEND_NOTIFICATION", "permission_code": "procurement.manage",
                            "title": "Purchase Order Approved", "message": "Large purchase order approved by workflow."}},
                {"code": "end", "name": "End", "type": "END", "config": {}},
            ],
        },
        {
            "code": "EMPLOYEE_ABSENCE_ALERT",
            "name": "Employee Absence Alert",
            "description": "Notifies shift managers when an employee records an absence.",
            "category": "HR",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["EMPLOYEE_ABSENCE_RECORDED"]},
            "steps": [
                {"code": "notify_manager", "name": "Notify Shift Manager", "type": "ACTION",
                 "config": {"action": "SEND_NOTIFICATION", "permission_code": "hr.shifts.manage",
                            "title": "Employee Absence", "message": "An employee has recorded an absence. Review shift coverage."}},
                {"code": "create_task", "name": "Create Coverage Task", "type": "ACTION",
                 "config": {"action": "CREATE_TASK", "title": "Arrange shift coverage", "priority": "HIGH"}},
                {"code": "end", "name": "End", "type": "END", "config": {}},
            ],
        },
        {
            "code": "LARGE_DISCOUNT_APPROVAL",
            "name": "Large Discount Approval",
            "description": "Approval gate for discounts above a configured threshold.",
            "category": "MARKETING",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["ORDER_CREATED"]},
            "conditions": {"field": "payload.discount_amount", "operator": "GREATER_THAN", "value": 200},
            "steps": [
                {"code": "approve", "name": "Discount Approval", "type": "APPROVAL",
                 "config": {"approver_role": "MANAGER", "amount": "{{payload.discount_amount}}",
                            "reason": "Discount above threshold", "expiry_hours": 24}},
                {"code": "end", "name": "End", "type": "END", "config": {}},
            ],
        },
        {
            "code": "LOYALTY_POINTS_BONUS",
            "name": "Loyalty Points Bonus",
            "description": "Awards bonus loyalty points when a completed order passes a spend threshold.",
            "category": "LOYALTY",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["ORDER_COMPLETED"]},
            "conditions": {"field": "payload.total_amount", "operator": "GREATER_THAN", "value": 100},
            "steps": [
                {"code": "award", "name": "Award Bonus Points", "type": "ACTION",
                 "config": {"action": "ADD_LOYALTY_POINTS", "spend_amount": "{{payload.total_amount}}"}},
                {"code": "end", "name": "End", "type": "END", "config": {}},
            ],
        },
    ]

    @classmethod
    def list_templates(cls) -> List[Dict[str, Any]]:
        return [
            {
                "code": t["code"],
                "name": t["name"],
                "description": t["description"],
                "category": t["category"],
                "trigger_type": t["trigger_type"],
                "trigger_config": t["trigger_config"],
                "steps": t["steps"],
                "conditions": t.get("conditions") or {},
            }
            for t in cls.TEMPLATES
        ]

    @classmethod
    def get_template(cls, code: str) -> Optional[Dict[str, Any]]:
        for template in cls.TEMPLATES:
            if template["code"] == code:
                return template
        return None

    @classmethod
    def instantiate(cls, code: str, restaurant: Optional[Restaurant], user: User, name: str = "") -> Workflow:
        template = cls.get_template(code)
        if template is None:
            raise ValidationError({"detail": f"Unknown template '{code}'"})
        data = {
            "name": name or template["name"],
            "code": code,
            "description": template["description"],
            "category": template["category"],
            "trigger_type": template["trigger_type"],
            "trigger_config": template["trigger_config"],
            "conditions": template.get("conditions") or {},
            "steps": template["steps"],
        }
        return WorkflowService.create_workflow(restaurant=restaurant, user=user, data=data)


# ---------------------------------------------------------------------------
# Automation analytics
# ---------------------------------------------------------------------------

class AutomationAnalyticsService:
    """Aggregated automation KPIs, computed from execution records."""

    @staticmethod
    def overview(restaurant: Restaurant, days: int = 30) -> Dict[str, Any]:
        from django.db.models import Count, Avg, Q, Sum, F
        from django.db.models.functions import TruncDate

        since = timezone.now() - timezone.timedelta(days=days)
        base = WorkflowExecution.objects.filter(restaurant=restaurant, created_at__gte=since)

        total = base.count()
        completed = base.filter(status=ExecutionStatus.COMPLETED).count()
        failed = base.filter(status=ExecutionStatus.FAILED).count()
        waiting = base.filter(status__in=[ExecutionStatus.WAITING, ExecutionStatus.APPROVAL_REQUIRED]).count()
        cancelled = base.filter(status=ExecutionStatus.CANCELLED).count()

        success_rate = round((completed / total * 100), 1) if total else 0.0
        failure_rate = round((failed / total * 100), 1) if total else 0.0

        avg_duration = base.filter(status=ExecutionStatus.COMPLETED).aggregate(
            avg=Avg(F("completed_at") - F("started_at"))
        )["avg"]

        avg_seconds = None
        if avg_duration is not None:
            avg_seconds = round(avg_duration.total_seconds(), 1)

        retries = WorkflowStepExecution.objects.filter(
            execution__restaurant=restaurant,
            execution__created_at__gte=since,
            retry_count__gt=0,
        ).aggregate(total_retries=Sum("retry_count"))["total_retries"] or 0

        most_used = (
            base.values("workflow__name", "workflow__code")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        action_failures = (
            WorkflowStepExecution.objects.filter(
                execution__restaurant=restaurant,
                execution__created_at__gte=since,
                status=StepExecutionStatus.FAILED,
            )
            .values("step_code")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        executions_today = WorkflowExecution.objects.filter(
            restaurant=restaurant,
            created_at__date=timezone.localdate(),
        ).count()

        completed_today = WorkflowExecution.objects.filter(
            restaurant=restaurant,
            status=ExecutionStatus.COMPLETED,
            completed_at__date=timezone.localdate(),
        ).count()

        failed_today = WorkflowExecution.objects.filter(
            restaurant=restaurant,
            status=ExecutionStatus.FAILED,
            completed_at__date=timezone.localdate(),
        ).count()

        active_workflows = Workflow.objects.filter(
            restaurant=restaurant,
            status=WorkflowStatus.ACTIVE,
            is_deleted=False,
        ).count()

        paused_workflows = Workflow.objects.filter(
            restaurant=restaurant,
            status=WorkflowStatus.PAUSED,
            is_deleted=False,
        ).count()

        pending_approvals = WorkflowApprovalRequest.objects.filter(
            execution__restaurant=restaurant,
            status=ApprovalStatus.PENDING,
        ).count()

        scheduled_runs = base.filter(trigger="SCHEDULE").count()
        escalations = WorkflowApprovalRequest.objects.filter(
            execution__restaurant=restaurant,
            escalation_count__gt=0,
            created_at__gte=since,
        ).count()

        daily = (
            base.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Count("id"), completed=Count("id", filter=Q(status=ExecutionStatus.COMPLETED)),
                      failed=Count("id", filter=Q(status=ExecutionStatus.FAILED)))
            .order_by("day")
        )

        return {
            "active_workflows": active_workflows,
            "paused_workflows": paused_workflows,
            "executions_total": total,
            "executions_today": executions_today,
            "completed_today": completed_today,
            "failed_today": failed_today,
            "successful": completed,
            "failed": failed,
            "waiting": waiting,
            "cancelled": cancelled,
            "success_rate": success_rate,
            "failure_rate": failure_rate,
            "avg_duration_seconds": avg_seconds,
            "retry_count": retries,
            "pending_approvals": pending_approvals,
            "scheduled_runs": scheduled_runs,
            "escalations": escalations,
            "most_used_workflows": [
                {"name": m["workflow__name"], "code": m["workflow__code"], "executions": m["count"]}
                for m in most_used
            ],
            "action_failures": [
                {"step_code": f["step_code"], "failures": f["count"]}
                for f in action_failures
            ],
            "daily": [
                {
                    "day": d["day"].isoformat(),
                    "total": d["total"],
                    "completed": d["completed"],
                    "failed": d["failed"],
                }
                for d in daily
            ],
        }


def _models_Q(*args, **kwargs):
    from django.db import models
    return models.Q(*args, **kwargs)
