"""Monitoring & observability API views — system-wide sections
(workflows, notifications, integrations, database, alerts, incidents, SLOs,
alert rules, and runtime configuration)."""
import logging
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.monitoring.alerts import AlertEngine
from apps.monitoring.constants import TaskRunStatus
from apps.monitoring.incidents import IncidentService
from apps.monitoring.models import (
    Alert,
    AlertRule,
    CeleryTaskRun,
    MonitoringConfig,
    MonitoringIncident,
    ServiceSLO,
)
from apps.monitoring.queries import (
    celery_stats,
    db_stats,
    integration_stats,
    notification_stats,
    oldest_queued_task_age_seconds,
    queue_depth,
    webhook_stats,
    workflow_stats,
)
from apps.monitoring.serializers import (
    AlertDetailSerializer,
    AlertListSerializer,
    AlertResolveSerializer,
    AlertRuleSerializer,
    IncidentDetailSerializer,
    IncidentListSerializer,
    IncidentNoteSerializer,
    IncidentResolveSerializer,
    MonitoringConfigSerializer,
    SLOSerializer,
)
from apps.monitoring.services import ConfigService
from apps.monitoring.views import SystemMonitoringView

logger = logging.getLogger("fluxiflow.monitoring.api")


class MonitoringJobsView(SystemMonitoringView):
    """Celery/queue monitoring: workers, queue depth, tasks, stuck jobs."""

    @extend_schema(summary="Background Job Monitoring")
    def get(self, request):
        from apps.core.health import check_celery_worker

        config = ConfigService.get()
        worker = check_celery_worker()
        queue = queue_depth()
        oldest = oldest_queued_task_age_seconds()
        stuck_threshold = timezone.now() - timedelta(minutes=config.celery_stuck_threshold_minutes)
        stuck_count = CeleryTaskRun.objects.filter(
            status=TaskRunStatus.RUNNING, started_at__lt=stuck_threshold
        ).count()

        return Response({
            "success": True,
            "data": {
                "workers": worker,
                "queue": {
                    "name": "celery",
                    "depth": queue,
                    "oldest_seconds": oldest,
                    "status": "healthy" if queue >= 0 else "unavailable",
                },
                "tasks": celery_stats(1440),
                "stuck": {
                    "count": stuck_count,
                    "threshold_minutes": config.celery_stuck_threshold_minutes,
                    "recent": list(
                        CeleryTaskRun.objects.filter(status=TaskRunStatus.STUCK)
                        .order_by("-started_at")[:10]
                        .values("task_name", "status", "correlation_id", "started_at")
                    ),
                },
            },
        })


class MonitoringWorkflowsView(SystemMonitoringView):
    """Workflow engine monitoring (computed from Prompt 33 models)."""

    @extend_schema(summary="Workflow Monitoring")
    def get(self, request):
        window = int(request.query_params.get("window", "1440"))
        return Response({"success": True, "data": workflow_stats(window)})


class MonitoringNotificationsView(SystemMonitoringView):
    """Notification delivery monitoring (measurement of Prompt 18)."""

    @extend_schema(summary="Notification Monitoring")
    def get(self, request):
        window = int(request.query_params.get("window", "1440"))
        return Response({"success": True, "data": notification_stats(window)})


class MonitoringIntegrationsView(SystemMonitoringView):
    """External integrations, webhooks, and WebSocket health."""

    @extend_schema(summary="Integration Monitoring")
    def get(self, request):
        from asgiref.sync import async_to_sync

        from apps.monitoring.ws_monitor import WSMonitor

        ws = async_to_sync(WSMonitor.snapshot)()
        ws_total = async_to_sync(WSMonitor.total_connections)()
        return Response({
            "success": True,
            "data": {
                "external": integration_stats(),
                "webhooks": webhook_stats(),
                "websockets": {
                    "active_by_type": ws,
                    "total_connections": ws_total,
                    "status": "healthy" if ws or ws_total else "no_active",
                },
            },
        })


class MonitoringDatabaseView(SystemMonitoringView):
    """Database monitoring: connectivity, slow queries."""

    @extend_schema(summary="Database Monitoring")
    def get(self, request):
        return Response({"success": True, "data": db_stats()})


class MonitoringAlertsListView(SystemMonitoringView):
    """Alert list (system-wide, authorized)."""

    @extend_schema(summary="List Alerts")
    def get(self, request):
        queryset = Alert.objects.all()
        status_filter = request.query_params.get("status")
        severity = request.query_params.get("severity")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        if severity:
            queryset = queryset.filter(severity=severity.upper())
        serializer = AlertListSerializer(queryset.order_by("-last_triggered_at")[:200], many=True)
        return Response({"success": True, "data": serializer.data})


class MonitoringAlertsDetailView(SystemMonitoringView):
    """Alert detail, acknowledge, and resolve."""

    def _get_alert(self, request, alert_id):
        from rest_framework.exceptions import NotFound

        alert = Alert.objects.filter(id=alert_id).first()
        if not alert:
            raise NotFound("Alert not found.")
        return alert

    @extend_schema(summary="Alert Detail")
    def get(self, request, alert_id):
        alert = self._get_alert(request, alert_id)
        return Response({"success": True, "data": AlertDetailSerializer(alert).data})

    @extend_schema(summary="Acknowledge Alert")
    def post(self, request, alert_id, action):
        alert = self._get_alert(request, alert_id)
        if action == "acknowledge":
            alert = AlertEngine.acknowledge(alert, request.user)
        elif action == "resolve":
            serializer = AlertResolveSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            alert = AlertEngine.resolve(
                alert, user=request.user, resolution_note=serializer.validated_data.get("resolution_note", "")
            )
        else:
            from rest_framework.exceptions import NotFound

            raise NotFound("Unknown alert action.")
        return Response({"success": True, "data": AlertDetailSerializer(alert).data})


class MonitoringAlertRulesView(SystemMonitoringView):
    """Alert rule configuration (monitoring.manage)."""

    @extend_schema(summary="List Alert Rules")
    def get(self, request):
        queryset = AlertRule.objects.all().order_by("name")
        serializer = AlertRuleSerializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data})

    @extend_schema(summary="Create Alert Rule")
    def post(self, request):
        from apps.audit.models import AuditActorType
        from apps.audit.services import AuditLogService

        serializer = AlertRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rule = serializer.save()
        try:
            AuditLogService.record(
                action="CREATE",
                entity_type="ALERT_RULE",
                entity_id=str(rule.id),
                description=f"Alert rule created: {rule.name}",
                actor_user=request.user,
                actor_type=AuditActorType.USER,
                metadata={"code": rule.code, "metric_type": rule.metric_type},
            )
        except Exception:
            logger.debug("Alert rule audit skipped", exc_info=True)
        return Response({"success": True, "data": AlertRuleSerializer(rule).data}, status=status.HTTP_201_CREATED)


class MonitoringAlertRulesDetailView(SystemMonitoringView):
    """Alert rule detail, update, toggle, delete."""

    def _get_rule(self, request, rule_id):
        from rest_framework.exceptions import NotFound

        rule = AlertRule.objects.filter(id=rule_id).first()
        if not rule:
            raise NotFound("Alert rule not found.")
        return rule

    @extend_schema(summary="Alert Rule Detail")
    def get(self, request, rule_id):
        rule = self._get_rule(request, rule_id)
        return Response({"success": True, "data": AlertRuleSerializer(rule).data})

    @extend_schema(summary="Update Alert Rule")
    def patch(self, request, rule_id):
        from apps.audit.models import AuditActorType
        from apps.audit.services import AuditLogService

        rule = self._get_rule(request, rule_id)
        serializer = AlertRuleSerializer(rule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        rule = serializer.save()
        try:
            AuditLogService.record(
                action="UPDATE",
                entity_type="ALERT_RULE",
                entity_id=str(rule.id),
                description=f"Alert rule updated: {rule.name}",
                actor_user=request.user,
                actor_type=AuditActorType.USER,
                metadata={"code": rule.code, "metric_type": rule.metric_type},
            )
        except Exception:
            logger.debug("Alert rule audit skipped", exc_info=True)
        return Response({"success": True, "data": AlertRuleSerializer(rule).data})

    @extend_schema(summary="Toggle Alert Rule")
    def post(self, request, rule_id):
        from apps.audit.models import AuditActorType
        from apps.audit.services import AuditLogService

        rule = self._get_rule(request, rule_id)
        rule.is_active = not rule.is_active
        rule.save(update_fields=["is_active", "updated_at"])
        try:
            AuditLogService.record(
                action="STATUS_CHANGED",
                entity_type="ALERT_RULE",
                entity_id=str(rule.id),
                description=f"Alert rule {'activated' if rule.is_active else 'deactivated'}: {rule.name}",
                actor_user=request.user,
                actor_type=AuditActorType.USER,
                metadata={"code": rule.code, "is_active": rule.is_active},
            )
        except Exception:
            logger.debug("Alert rule audit skipped", exc_info=True)
        return Response({"success": True, "data": AlertRuleSerializer(rule).data})


class MonitoringIncidentsListView(SystemMonitoringView):
    """Operational incident list + MTTA/MTTR metrics."""

    @extend_schema(summary="List Incidents")
    def get(self, request):
        queryset = MonitoringIncident.objects.all()
        status_filter = request.query_params.get("status")
        severity = request.query_params.get("severity")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        if severity:
            queryset = queryset.filter(severity=severity.upper())
        metrics = IncidentService.metrics(30)
        serializer = IncidentListSerializer(queryset.order_by("-detected_at")[:200], many=True)
        return Response({"success": True, "data": {"incidents": serializer.data, "metrics": metrics}})


class MonitoringIncidentsDetailView(SystemMonitoringView):
    """Incident detail, acknowledge, resolve, and notes."""

    def _get_incident(self, request, incident_id):
        from rest_framework.exceptions import NotFound

        incident = MonitoringIncident.objects.filter(id=incident_id).first()
        if not incident:
            raise NotFound("Incident not found.")
        return incident

    @extend_schema(summary="Incident Detail")
    def get(self, request, incident_id):
        incident = self._get_incident(request, incident_id)
        return Response({"success": True, "data": IncidentDetailSerializer(incident).data})

    @extend_schema(summary="Acknowledge Incident")
    def post(self, request, incident_id, action):
        incident = self._get_incident(request, incident_id)
        if action == "acknowledge":
            incident = IncidentService.acknowledge(incident, request.user)
        elif action == "resolve":
            serializer = IncidentResolveSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            incident = IncidentService.resolve(
                incident, request.user, notes=serializer.validated_data.get("notes", "")
            )
        elif action == "notes":
            serializer = IncidentNoteSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            incident = IncidentService.add_note(incident, request.user, serializer.validated_data["text"])
        else:
            from rest_framework.exceptions import NotFound

            raise NotFound("Unknown incident action.")
        return Response({"success": True, "data": IncidentDetailSerializer(incident).data})


class MonitoringSLOListView(SystemMonitoringView):
    """Service-level objective foundation (internal targets, never SLAs)."""

    @extend_schema(summary="List SLOs")
    def get(self, request):
        serializer = SLOSerializer(ServiceSLO.objects.all().order_by("service", "name"), many=True)
        return Response({"success": True, "data": serializer.data})

    @extend_schema(summary="Create SLO")
    def post(self, request):
        serializer = SLOSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slo = serializer.save()
        return Response({"success": True, "data": SLOSerializer(slo).data}, status=status.HTTP_201_CREATED)


class MonitoringSLODetailView(SystemMonitoringView):
    """SLO detail, update, and manual re-evaluation."""

    def _get_slo(self, request, slo_id):
        from rest_framework.exceptions import NotFound

        slo = ServiceSLO.objects.filter(id=slo_id).first()
        if not slo:
            raise NotFound("SLO not found.")
        return slo

    @extend_schema(summary="SLO Detail")
    def get(self, request, slo_id):
        slo = self._get_slo(request, slo_id)
        return Response({"success": True, "data": SLOSerializer(slo).data})

    @extend_schema(summary="Update SLO")
    def patch(self, request, slo_id):
        slo = self._get_slo(request, slo_id)
        serializer = SLOSerializer(slo, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        slo = serializer.save()
        return Response({"success": True, "data": SLOSerializer(slo).data})

    @extend_schema(summary="Evaluate SLO Now")
    def post(self, request, slo_id):
        from apps.monitoring.slos import SLOComputeService

        slo = self._get_slo(request, slo_id)
        result = SLOComputeService.compute(slo)
        slo.latest_sli = result["sli"]
        slo.latest_error_budget_remaining = result["error_budget_remaining"]
        slo.evaluated_at = timezone.now()
        slo.save(update_fields=["latest_sli", "latest_error_budget_remaining", "evaluated_at", "updated_at"])
        return Response({"success": True, "data": SLOSerializer(slo).data})


class MonitoringConfigView(SystemMonitoringView):
    """Runtime observability configuration (monitoring.manage)."""

    @extend_schema(summary="Get Monitoring Configuration")
    def get(self, request):
        config = ConfigService.get()
        return Response({"success": True, "data": MonitoringConfigSerializer(config).data})

    @extend_schema(summary="Update Monitoring Configuration")
    def patch(self, request):
        from apps.audit.models import AuditActorType
        from apps.audit.services import AuditLogService

        config = ConfigService.get()
        serializer = MonitoringConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        config = serializer.save()
        ConfigService.invalidate()
        try:
            AuditLogService.record(
                action="UPDATE",
                entity_type="MONITORING_CONFIG",
                entity_id=str(config.id),
                description="Monitoring configuration updated",
                actor_user=request.user,
                actor_type=AuditActorType.USER,
                metadata={k: v for k, v in serializer.validated_data.items() if k != "retention_days"},
            )
        except Exception:
            logger.debug("Monitoring config audit skipped", exc_info=True)
        return Response({"success": True, "data": MonitoringConfigSerializer(config).data})