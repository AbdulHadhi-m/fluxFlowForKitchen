"""Django admin registration for the monitoring domain (operator access)."""
from django.contrib import admin

from apps.monitoring.models import (
    Alert,
    AlertRule,
    CeleryTaskRun,
    ErrorEvent,
    ExternalServiceMetric,
    MonitoringConfig,
    MonitoringIncident,
    NotificationDeliveryMetric,
    RequestLatencySample,
    RequestMetric,
    ServiceSLO,
    SlowQueryLog,
    WebhookDelivery,
)


@admin.register(ErrorEvent)
class ErrorEventAdmin(admin.ModelAdmin):
    list_display = ("error_type", "module", "severity", "status", "count", "last_seen")
    list_filter = ("module", "severity", "status", "environment")
    search_fields = ("error_type", "message", "fingerprint")
    readonly_fields = ("fingerprint", "first_seen", "last_seen")


@admin.register(RequestMetric)
class RequestMetricAdmin(admin.ModelAdmin):
    list_display = ("method", "endpoint", "status_class", "count", "max_duration_ms", "bucket_minute")
    list_filter = ("status_class",)
    search_fields = ("endpoint",)


@admin.register(SlowQueryLog)
class SlowQueryLogAdmin(admin.ModelAdmin):
    list_display = ("signature", "duration_ms", "count", "last_seen")
    search_fields = ("signature",)


@admin.register(CeleryTaskRun)
class CeleryTaskRunAdmin(admin.ModelAdmin):
    list_display = ("task_name", "status", "duration_ms", "retry_count", "started_at")
    list_filter = ("status",)
    search_fields = ("task_name",)


@admin.register(NotificationDeliveryMetric)
class NotificationDeliveryMetricAdmin(admin.ModelAdmin):
    list_display = ("channel", "status", "notification_type", "created_at")
    list_filter = ("channel", "status")


@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
    list_display = ("host", "path", "status_code", "success", "duration_ms", "created_at")
    list_filter = ("success",)


@admin.register(ExternalServiceMetric)
class ExternalServiceMetricAdmin(admin.ModelAdmin):
    list_display = ("service", "status", "duration_ms", "created_at")
    list_filter = ("service", "status")


@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "service", "metric_type", "severity", "is_active")
    list_filter = ("service", "severity", "is_active")
    search_fields = ("name", "code")


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "severity", "trigger_count", "last_triggered_at")
    list_filter = ("status", "severity")


@admin.register(MonitoringIncident)
class MonitoringIncidentAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "severity", "affected_service", "detected_at")
    list_filter = ("status", "severity")


@admin.register(ServiceSLO)
class ServiceSLOAdmin(admin.ModelAdmin):
    list_display = ("name", "service", "slo_type", "target", "latest_sli", "is_active")
    list_filter = ("service", "slo_type", "is_active")


@admin.register(MonitoringConfig)
class MonitoringConfigAdmin(admin.ModelAdmin):
    list_display = ("metrics_enabled", "latency_sample_rate", "slow_query_threshold_ms")


@admin.register(RequestLatencySample)
class RequestLatencySampleAdmin(admin.ModelAdmin):
    list_display = ("method", "endpoint", "duration_ms", "status_class", "sampled_at")
    list_filter = ("status_class",)