import csv
from django.http import HttpResponse
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from apps.rbac.permissions import require_permission
from apps.core.pagination import FluxiflowPagination
from apps.restaurants.services import RestaurantService
from apps.reports.services import DateFilterHelper
from apps.audit.models import AuditLog, AuditAction, AuditEntityType
from apps.audit.serializers import AuditLogSerializer
from apps.audit.services import AuditLogService

class AuditLogListView(APIView, FluxiflowPagination):
    """
    Query restaurant audit trails with search and multi-attribute filters.
    """
    permission_classes = [IsAuthenticated, require_permission("audit.view")]

    @extend_schema(summary="List Restaurant Audit Logs")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = AuditLog.objects.filter(restaurant=restaurant).order_by("-created_at")

        # Date range filtering
        preset = request.query_params.get("preset")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if preset or (start_date and end_date):
            start_dt, end_dt = DateFilterHelper.get_range(preset or "CUSTOM", start_date, end_date)
            queryset = queryset.filter(created_at__range=(start_dt, end_dt))

        # Action filter
        action = request.query_params.get("action")
        if action:
            queryset = queryset.filter(action=action.upper())

        # Entity type filter
        entity_type = request.query_params.get("entity_type")
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type.upper())

        # Actor search
        actor = request.query_params.get("actor")
        if actor:
            queryset = queryset.filter(actor_email__icontains=actor)

        # General search
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search)
                | Q(entity_id__icontains=search)
                | Q(actor_email__icontains=search)
                | Q(action__icontains=search)
            )

        page = self.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = AuditLogSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AuditLogSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class AuditLogDetailView(APIView):
    """
    Retrieve single audit record details with complete before/after snapshots.
    """
    permission_classes = [IsAuthenticated, require_permission("audit.view")]

    @extend_schema(summary="Get Audit Log Detail")
    def get(self, request, log_id):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        log = AuditLog.objects.filter(id=log_id, restaurant=restaurant).first()
        if not log:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Audit log not found.", "status_code": status.HTTP_404_NOT_FOUND}},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "data": AuditLogSerializer(log).data}, status=status.HTTP_200_OK)


class AuditLogExportView(APIView):
    """
    Export audit logs into CSV format and records an EXPORT audit event.
    """
    permission_classes = [IsAuthenticated, require_permission("audit.view")]

    @extend_schema(summary="Export Audit Logs as CSV")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        queryset = AuditLog.objects.filter(restaurant=restaurant).order_by("-created_at")[:1000]

        # Audit the export action
        AuditLogService.record(
            action=AuditAction.EXPORT,
            entity_type=AuditEntityType.REPORT,
            entity_id="audit_logs_csv",
            description=f"Exported {queryset.count()} audit log records to CSV",
            restaurant=restaurant,
            actor_user=request.user,
            request=request,
        )

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="audit_logs.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "Timestamp",
            "Actor Email",
            "Actor Role",
            "Action",
            "Entity Type",
            "Entity ID",
            "Description",
            "IP Address",
            "Correlation ID",
        ])

        for log in queryset:
            writer.writerow([
                log.created_at.isoformat(),
                log.actor_email,
                log.actor_role,
                log.action,
                log.entity_type,
                log.entity_id,
                log.description,
                log.ip_address,
                log.correlation_id,
            ])

        return response
