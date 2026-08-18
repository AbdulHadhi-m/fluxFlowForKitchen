"""Monitoring & observability API views — core sections.

RBAC model:
- ``monitoring.view`` — restaurant-scoped monitoring (errors, restaurant overview)
- ``monitoring.manage`` — system-wide monitoring (metrics, health, jobs, alerts,
  incidents, integrations, configuration). Superusers always have full access.

Tenant isolation: non-superuser users only ever see their own restaurant's
error events and restaurant-scoped data (section 90).
"""
import logging
import time
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from apps.core.pagination import FluxiflowPagination
from apps.core.version import build_info
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.monitoring.constants import ErrorSeverity, ErrorStatus, IncidentStatus
from apps.monitoring.incidents import IncidentService
from apps.monitoring.models import Alert, ErrorEvent, MonitoringIncident
from apps.monitoring.queries import (
    celery_stats,
    error_event_stats,
    latency_percentiles,
    request_summary,
    top_slow_endpoints,
)
from apps.monitoring.serializers import (
    ErrorEventDetailSerializer,
    ErrorEventListSerializer,
    ErrorEventStatusSerializer,
    FrontendErrorReportSerializer,
    IncidentListSerializer,
)
from apps.monitoring.services import ErrorTrackingService

logger = logging.getLogger("fluxiflow.monitoring.api")

_PROCESS_STARTED = time.time()


def _uptime_seconds() -> int:
    return int(time.time() - _PROCESS_STARTED)


def restaurant_scope(request):
    """Return the user's restaurant (tenant) scope or None for superusers."""
    if request.user.is_superuser:
        return None
    try:
        return RestaurantService.get_user_restaurant(request.user)
    except Exception:
        return None


def is_system_authorized(request) -> bool:
    """System-wide monitoring requires superuser or monitoring.manage."""
    if request.user.is_superuser:
        return True
    from apps.rbac.services import RBACService

    perms = RBACService.get_effective_permissions(request.user, getattr(request, "tenant_id", None))
    return "monitoring.manage" in perms


class SystemMonitoringView(APIView):
    """Base view enforcing monitoring.manage for system-wide sections."""

    permission_classes = [IsAuthenticated, require_permission("monitoring.view")]

    def check_permissions(self, request):
        super().check_permissions(request)
        if not is_system_authorized(request):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("System-wide monitoring requires monitoring.manage.")


class MonitoringOverviewView(APIView):
    """System overview: status, uptime, requests, errors, latency, jobs,
    incidents, and active alerts."""

    permission_classes = [IsAuthenticated, require_permission("monitoring.view")]

    @extend_schema(summary="Monitoring Overview")
    def get(self, request):
        restaurant = restaurant_scope(request)
        system_authorized = is_system_authorized(request)

        now = timezone.now()
        window = int(request.query_params.get("window", "30"))
        req_summary = (
            request_summary(window)
            if system_authorized
            else {"total": 0, "errors": 0, "by_class": {}, "error_rate": 0}
        )
        latency = latency_percentiles(max(window, 30)) if system_authorized else {}

        from apps.core.health import HealthService

        health = HealthService.run_all()

        error_qs = ErrorEvent.objects.all()
        if restaurant:
            error_qs = error_qs.filter(restaurant=restaurant)
        if system_authorized:
            error_stats = error_event_stats(max(window, 60))
        else:
            error_stats = {
                "count": error_qs.filter(last_seen__gte=now - timedelta(minutes=window)).count(),
                "new": error_qs.filter(status=ErrorStatus.NEW).count(),
            }

        alerts_qs = Alert.objects.filter(status__in=["ACTIVE", "ACKNOWLEDGED"])
        incidents_qs = MonitoringIncident.objects.filter(
            status__in=[IncidentStatus.OPEN, IncidentStatus.INVESTIGATING]
        )
        if restaurant:
            alerts_qs = alerts_qs.filter(restaurant=restaurant)
            incidents_qs = incidents_qs.filter(restaurant=restaurant)

        incident_metrics = IncidentService.metrics(30) if system_authorized else None

        return Response({
            "success": True,
            "data": {
                "scope": "restaurant" if restaurant else "system",
                "status": health["status"] if system_authorized else "restricted",
                "version": build_info(),
                "uptime_seconds": _uptime_seconds(),
                "requests": req_summary,
                "latency": latency,
                "errors": error_stats,
                "jobs": celery_stats(60) if system_authorized else None,
                "alerts": {
                    "active": alerts_qs.filter(status="ACTIVE").count(),
                    "acknowledged": alerts_qs.filter(status="ACKNOWLEDGED").count(),
                    "critical": alerts_qs.filter(severity="CRITICAL").count(),
                },
                "incidents": {
                    "open": incidents_qs.count(),
                    "recent": IncidentListSerializer(incidents_qs.order_by("-detected_at")[:5], many=True).data,
                },
                "incident_metrics": incident_metrics,
                "dependencies": health["dependencies"] if system_authorized else None,
            },
        })


class MonitoringErrorsListView(APIView, FluxiflowPagination):
    """Aggregated error events with fingerprint grouping (system or tenant scope)."""

    permission_classes = [IsAuthenticated, require_permission("monitoring.view")]

    @extend_schema(summary="List Error Events")
    def get(self, request):
        restaurant = restaurant_scope(request)
        queryset = ErrorEvent.objects.all()
        if restaurant:
            queryset = queryset.filter(restaurant=restaurant)

        status_filter = request.query_params.get("status")
        severity = request.query_params.get("severity")
        module = request.query_params.get("module")
        search = request.query_params.get("search")
        preset = request.query_params.get("preset")

        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        if severity:
            queryset = queryset.filter(severity=severity.upper())
        if module:
            queryset = queryset.filter(module=module.lower())
        if search:
            queryset = queryset.filter(Q(message__icontains=search) | Q(error_type__icontains=search))
        if preset == "24h":
            queryset = queryset.filter(last_seen__gte=timezone.now() - timedelta(hours=24))
        elif preset == "7d":
            queryset = queryset.filter(last_seen__gte=timezone.now() - timedelta(days=7))

        page = self.paginate_queryset(queryset.order_by("-last_seen"), request, view=self)
        serializer = ErrorEventListSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @extend_schema(summary="Report Frontend Error", request=FrontendErrorReportSerializer)
    def post(self, request):
        """Frontend error ingestion (whitelist-only fields, sanitized)."""
        serializer = FrontendErrorReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        restaurant = restaurant_scope(request)
        event = ErrorTrackingService.record_frontend(
            message=data["message"],
            stack=data.get("stack", ""),
            url=data.get("url", ""),
            component=data.get("component", ""),
            endpoint=data.get("endpoint", ""),
            method=data.get("method", ""),
            status_code=data.get("status_code"),
            severity=data.get("severity", ErrorSeverity.MEDIUM),
            user=request.user,
            restaurant=restaurant,
            correlation_id=getattr(request, "correlation_id", ""),
        )
        return Response(
            {"success": True, "data": {"id": str(event.id) if event else None}},
            status=status.HTTP_201_CREATED,
        )


class MonitoringErrorsDetailView(APIView):
    """Error event detail + status transitions."""

    permission_classes = [IsAuthenticated, require_permission("monitoring.view")]

    def _get_event(self, request, error_id):
        from rest_framework.exceptions import NotFound

        restaurant = restaurant_scope(request)
        queryset = ErrorEvent.objects.all()
        if restaurant:
            queryset = queryset.filter(restaurant=restaurant)
        event = queryset.filter(id=error_id).first()
        if not event:
            raise NotFound("Error event not found.")
        return event

    @extend_schema(summary="Error Event Detail")
    def get(self, request, error_id):
        event = self._get_event(request, error_id)
        return Response({"success": True, "data": ErrorEventDetailSerializer(event).data})

    @extend_schema(summary="Update Error Event Status", request=ErrorEventStatusSerializer)
    def patch(self, request, error_id):
        event = self._get_event(request, error_id)
        serializer = ErrorEventStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = ErrorTrackingService.update_status(
            event, serializer.validated_data["status"], user=request.user
        )
        return Response({"success": True, "data": ErrorEventDetailSerializer(updated).data})


class MonitoringMetricsView(SystemMonitoringView):
    """API performance metrics: latency percentiles, error rates, top endpoints."""

    @extend_schema(summary="API Performance Metrics")
    def get(self, request):
        window = int(request.query_params.get("window", "30"))
        return Response({
            "success": True,
            "data": {
                "requests": request_summary(window),
                "latency": latency_percentiles(max(window, 30)),
                "top_slow_endpoints": top_slow_endpoints(max(window, 60)),
            },
        })


class MonitoringHealthView(SystemMonitoringView):
    """Authorized system health (same data as public /health/ + more)."""

    @extend_schema(summary="System Health (Authorized)")
    def get(self, request):
        from apps.core.health import HealthService

        result = HealthService.run_all()
        result["version"] = build_info()
        result["timestamp"] = timezone.now().isoformat()
        result["uptime_seconds"] = _uptime_seconds()
        return Response({"success": True, "data": result})