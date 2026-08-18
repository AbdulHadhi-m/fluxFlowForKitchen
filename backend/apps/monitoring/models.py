"""Data models for the monitoring & observability domain.

Design notes:
- Monitoring data is low-cardinality by design: aggregated error fingerprints,
  minute-bucketed request metrics, and sampled latency rows. Raw per-request
  rows with unbounded labels (user/order/request IDs) are never stored.
- All models are append/aggregate oriented; cleanup is enforced by scheduled
  retention jobs (apps.monitoring.tasks.cleanup_monitoring_data).
"""
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.models import UUIDModel, TimeStampedModel
from apps.monitoring.constants import (
    DEFAULT_RETENTION_DAYS,
    ErrorStatus,
    ErrorSeverity,
    ErrorModule,
    TaskRunStatus,
    DeliveryChannel,
    DeliveryStatus,
    ExternalService,
    ExternalCallStatus,
    AlertSeverity,
    AlertStatus,
    MonitoringService,
    IncidentStatus,
    SLOType,
)


class MonitoringConfig(UUIDModel, TimeStampedModel):
    """
    Singleton runtime configuration for the observability layer.
    Falls back to MONITORING_* Django settings when no row exists.
    """

    is_default = models.BooleanField(default=True, unique=True, editable=False)

    metrics_enabled = models.BooleanField(
        default=True, help_text="Master switch for request metric recording."
    )
    request_logging_enabled = models.BooleanField(
        default=True, help_text="Structured request completion log lines."
    )
    latency_sample_rate = models.FloatField(
        default=0.1,
        help_text="Fraction of requests recorded as latency samples (0..1).",
    )
    slow_query_threshold_ms = models.PositiveIntegerField(
        default=500, help_text="Queries slower than this are recorded."
    )
    error_min_status = models.PositiveIntegerField(
        default=500, help_text="HTTP status threshold for error event aggregation."
    )
    celery_stuck_threshold_minutes = models.PositiveIntegerField(
        default=15,
        help_text="Running tasks older than this are flagged STUCK.",
    )
    retention_days = models.JSONField(
        default=dict,
        help_text="Per-category retention in days. Unknown categories use defaults.",
    )

    class Meta:
        verbose_name = "Monitoring Configuration"
        verbose_name_plural = "Monitoring Configuration"

    @classmethod
    def load(cls) -> "MonitoringConfig":
        try:
            obj, _ = cls.objects.get_or_create(is_default=True)
            return obj
        except Exception:
            return cls(is_default=True)

    def get_retention_days(self, category: str) -> int:
        merged = dict(DEFAULT_RETENTION_DAYS)
        merged.update(self.retention_days or {})
        return merged.get(category, DEFAULT_RETENTION_DAYS.get(category, 30))


class ErrorEvent(UUIDModel, TimeStampedModel):
    """
    Aggregated, fingerprint-grouped application error record.

    Similar errors (same fingerprint) are merged into a single row and counted,
    preventing duplicate-error explosion for the same underlying issue.
    """

    fingerprint = models.CharField(max_length=64, db_index=True, editable=False)
    error_type = models.CharField(max_length=255)
    message = models.TextField(help_text="Safe, sanitized error message")
    stack_trace = models.TextField(
        blank=True, default="", help_text="Internal diagnostic stack trace (never exposed via UI/API)"
    )
    module = models.CharField(
        max_length=50, choices=ErrorModule.choices, default=ErrorModule.API, db_index=True
    )
    endpoint = models.CharField(
        max_length=255, blank=True, default="", help_text="Normalized endpoint (no raw IDs)"
    )
    severity = models.CharField(
        max_length=20, choices=ErrorSeverity.choices, default=ErrorSeverity.MEDIUM, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=ErrorStatus.choices, default=ErrorStatus.NEW, db_index=True
    )
    count = models.PositiveIntegerField(default=1)
    first_seen = models.DateTimeField(db_index=True)
    last_seen = models.DateTimeField(db_index=True)
    environment = models.CharField(max_length=50, default="development", db_index=True)
    version = models.CharField(max_length=100, blank=True, default="")
    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="error_events",
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="error_events",
    )
    correlation_id = models.CharField(max_length=64, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True, help_text="Safe, sanitized context")

    class Meta:
        ordering = ["-last_seen"]
        constraints = [
            models.UniqueConstraint(
                fields=["fingerprint", "environment"],
                name="unique_error_fingerprint_per_env",
            )
        ]
        indexes = [
            models.Index(fields=["status", "last_seen"]),
            models.Index(fields=["severity", "last_seen"]),
            models.Index(fields=["module", "last_seen"]),
            models.Index(fields=["restaurant", "last_seen"]),
        ]

    def __str__(self):
        return f"{self.error_type} x{self.count} ({self.status})"


class RequestMetric(UUIDModel):
    """Minute-bucketed per-endpoint request counters (low cardinality)."""

    bucket_minute = models.DateTimeField(db_index=True)
    method = models.CharField(max_length=10)
    endpoint = models.CharField(max_length=255, help_text="Normalized route (no raw IDs)")
    status_class = models.CharField(max_length=3, help_text="e.g. 2xx, 3xx, 4xx, 5xx")
    count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)
    total_duration_ms = models.BigIntegerField(default=0)
    max_duration_ms = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-bucket_minute"]
        constraints = [
            models.UniqueConstraint(
                fields=["bucket_minute", "method", "endpoint", "status_class"],
                name="unique_request_metric_bucket",
            )
        ]
        indexes = [
            models.Index(fields=["bucket_minute", "status_class"]),
            models.Index(fields=["endpoint", "bucket_minute"]),
        ]

    def __str__(self):
        return f"{self.method} {self.endpoint} {self.status_class} x{self.count}"


class RequestLatencySample(UUIDModel):
    """Sampled request latencies used for percentile estimates (P50/P95/P99)."""

    sampled_at = models.DateTimeField(db_index=True)
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10)
    status_class = models.CharField(max_length=3)
    duration_ms = models.PositiveIntegerField()

    class Meta:
        ordering = ["-sampled_at"]
        indexes = [models.Index(fields=["sampled_at", "status_class"])]

    def __str__(self):
        return f"{self.method} {self.endpoint}: {self.duration_ms}ms"


class SlowQueryLog(UUIDModel, TimeStampedModel):
    """
    Aggregated slow-query detection log.
    Query parameters are normalized away before storage (privacy by design).
    """

    signature = models.CharField(max_length=500, db_index=True, help_text="Normalized SQL (values stripped)")
    duration_ms = models.PositiveIntegerField()
    count = models.PositiveIntegerField(default=1)
    first_seen = models.DateTimeField(db_index=True)
    last_seen = models.DateTimeField(db_index=True)
    endpoint = models.CharField(max_length=255, blank=True, default="")
    correlation_id = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["-last_seen"]
        constraints = [
            models.UniqueConstraint(fields=["signature"], name="unique_slow_query_signature")
        ]
        indexes = [models.Index(fields=["last_seen", "duration_ms"])]

    def __str__(self):
        return f"SlowQuery {self.duration_ms}ms x{self.count}"


class CeleryTaskRun(UUIDModel):
    """Per-task execution record created by Celery signal instrumentation."""

    task_name = models.CharField(max_length=255, db_index=True)
    status = models.CharField(
        max_length=20, choices=TaskRunStatus.choices, default=TaskRunStatus.RUNNING, db_index=True
    )
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    correlation_id = models.CharField(max_length=64, blank=True, default="")
    error_type = models.CharField(max_length=255, blank=True, default="")
    error_message = models.TextField(blank=True, default="", help_text="Sanitized failure reason")
    restaurant_id = models.UUIDField(null=True, blank=True, db_index=True)
    started_at = models.DateTimeField(db_index=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["task_name", "started_at"]),
            models.Index(fields=["status", "started_at"]),
        ]

    def __str__(self):
        return f"{self.task_name} {self.status}"


class NotificationDeliveryMetric(UUIDModel):
    """Delivery attempt metrics for the existing notification system."""

    channel = models.CharField(
        max_length=20, choices=DeliveryChannel.choices, default=DeliveryChannel.IN_APP, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.SENT, db_index=True
    )
    notification_type = models.CharField(max_length=50, blank=True, default="")
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    error_code = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["created_at", "channel", "status"])]

    def __str__(self):
        return f"{self.channel} {self.status}"


class WebhookDelivery(UUIDModel):
    """
    Outbound webhook delivery trace. Request/response bodies are never stored;
    only safe metadata (host, path, status, duration, error code).
    """

    host = models.CharField(max_length=255, blank=True, default="")
    path = models.CharField(max_length=255, blank=True, default="")
    method = models.CharField(max_length=10, default="POST")
    status_code = models.PositiveIntegerField(null=True, blank=True)
    success = models.BooleanField(default=False, db_index=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    error_code = models.CharField(max_length=100, blank=True, default="")
    signature_valid = models.BooleanField(null=True, blank=True)
    rate_limited = models.BooleanField(default=False)
    workflow_id = models.UUIDField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["created_at", "success"])]

    def __str__(self):
        return f"Webhook {self.host}{self.path} {self.status_code}"


class ExternalServiceMetric(UUIDModel):
    """Per-call metrics for external integrations (payments, email, maps, ...)."""

    service = models.CharField(
        max_length=20, choices=ExternalService.choices, default=ExternalService.OTHER, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=ExternalCallStatus.choices, default=ExternalCallStatus.SUCCESS, db_index=True
    )
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    error_code = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["created_at", "service", "status"])]

    def __str__(self):
        return f"{self.service} {self.status}"


class AlertRule(UUIDModel, TimeStampedModel):
    """Configurable alert rule evaluated by the scheduled alert engine."""

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    service = models.CharField(
        max_length=50, choices=MonitoringService.choices, default=MonitoringService.API
    )
    metric_type = models.CharField(max_length=100, db_index=True)
    operator = models.CharField(
        max_length=10,
        choices=[("GT", "Greater Than"), ("GTE", "Greater or Equal"), ("LT", "Less Than"), ("LTE", "Less or Equal")],
        default="GT",
    )
    threshold = models.FloatField(default=0)
    window_minutes = models.PositiveIntegerField(default=5)
    severity = models.CharField(
        max_length=20, choices=AlertSeverity.choices, default=AlertSeverity.WARNING
    )
    cooldown_minutes = models.PositiveIntegerField(
        default=60, help_text="Minimum interval between repeat notifications."
    )
    auto_resolve_minutes = models.PositiveIntegerField(
        default=10, help_text="Automatically resolve after the condition clears for this long."
    )
    notify_permission = models.CharField(
        max_length=100, default="monitoring.view", help_text="RBAC permission that receives alerts."
    )
    create_incident = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Alert(UUIDModel, TimeStampedModel):
    """A single alert lifecycle record (deduplicated per rule)."""

    rule = models.ForeignKey(AlertRule, on_delete=models.CASCADE, related_name="alerts")
    status = models.CharField(
        max_length=20, choices=AlertStatus.choices, default=AlertStatus.ACTIVE, db_index=True
    )
    severity = models.CharField(max_length=20, choices=AlertSeverity.choices, db_index=True)
    title = models.CharField(max_length=200)
    message = models.TextField()
    metric_value = models.FloatField(null=True, blank=True)
    dedup_key = models.CharField(max_length=128, blank=True, default="", db_index=True)
    first_triggered_at = models.DateTimeField(db_index=True)
    last_triggered_at = models.DateTimeField(db_index=True)
    trigger_count = models.PositiveIntegerField(default=1)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="resolved_alerts"
    )
    resolution_note = models.TextField(blank=True, default="")
    acknowledged_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="acknowledged_alerts"
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    restaurant = models.ForeignKey(
        "restaurants.Restaurant", on_delete=models.CASCADE, null=True, blank=True, related_name="alerts"
    )
    incident = models.ForeignKey(
        "monitoring.MonitoringIncident", on_delete=models.SET_NULL, null=True, blank=True, related_name="alerts"
    )

    class Meta:
        ordering = ["-last_triggered_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["dedup_key"],
                condition=Q(status="ACTIVE"),
                name="unique_active_alert_per_dedup_key",
            )
        ]
        indexes = [
            models.Index(fields=["status", "last_triggered_at"]),
            models.Index(fields=["severity", "last_triggered_at"]),
            models.Index(fields=["rule", "status"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"


class MonitoringIncident(UUIDModel, TimeStampedModel):
    """
    Operational incident record. Critical alerts may auto-create incidents;
    timeline entries support MTTA/MTTR measurement.
    """

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    severity = models.CharField(
        max_length=20, choices=AlertSeverity.choices, default=AlertSeverity.CRITICAL, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=IncidentStatus.choices, default=IncidentStatus.OPEN, db_index=True
    )
    affected_service = models.CharField(
        max_length=50, choices=MonitoringService.choices, default=MonitoringService.INFRA
    )
    version = models.CharField(max_length=100, blank=True, default="")
    source_alert = models.ForeignKey(
        Alert, on_delete=models.SET_NULL, null=True, blank=True, related_name="incident_source"
    )
    restaurant = models.ForeignKey(
        "restaurants.Restaurant", on_delete=models.CASCADE, null=True, blank=True, related_name="monitoring_incidents"
    )
    detected_at = models.DateTimeField(db_index=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    resolution_notes = models.TextField(blank=True, default="")
    mtta_minutes = models.PositiveIntegerField(null=True, blank=True, help_text="Mean time to acknowledge")
    mttr_minutes = models.PositiveIntegerField(null=True, blank=True, help_text="Mean time to resolve")
    timeline = models.JSONField(default=list, blank=True)
    related_security_incident = models.ForeignKey(
        "security.SecurityIncident",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="monitoring_links",
        help_text="Optional link to Prompt 34 security incident management.",
    )

    class Meta:
        ordering = ["-detected_at"]
        indexes = [
            models.Index(fields=["status", "detected_at"]),
            models.Index(fields=["severity", "detected_at"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"


class ServiceSLO(UUIDModel, TimeStampedModel):
    """
    Configurable service-level objective (internal target — never a contractual SLA).
    SLI and error budget are computed by the scheduled SLO evaluator.
    """

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    service = models.CharField(max_length=50, choices=MonitoringService.choices, db_index=True)
    slo_type = models.CharField(max_length=20, choices=SLOType.choices, db_index=True)
    target = models.FloatField(help_text="Target value (percentage or ms, depending on type)")
    window_days = models.PositiveIntegerField(default=30)
    evaluation_config = models.JSONField(default=dict, blank=True)
    is_contractual = models.BooleanField(
        default=False, help_text="False = internal SLO. Contractual SLAs are never defined here."
    )
    is_active = models.BooleanField(default=True, db_index=True)
    latest_sli = models.FloatField(null=True, blank=True)
    latest_error_budget_remaining = models.FloatField(null=True, blank=True)
    evaluated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["service", "name"]

    def __str__(self):
        return f"{self.name} ({self.slo_type}: {self.target})"