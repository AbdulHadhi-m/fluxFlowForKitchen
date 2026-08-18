"""Serializers for the monitoring & observability API."""
from rest_framework import serializers

from apps.monitoring.constants import ErrorStatus
from apps.monitoring.models import (
    Alert,
    AlertRule,
    ErrorEvent,
    MonitoringConfig,
    MonitoringIncident,
    ServiceSLO,
)


class ErrorEventListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErrorEvent
        fields = [
            "id", "error_type", "message", "module", "endpoint", "severity", "status",
            "count", "first_seen", "last_seen", "environment", "version", "correlation_id",
        ]


class ErrorEventDetailSerializer(ErrorEventListSerializer):
    class Meta(ErrorEventListSerializer.Meta):
        fields = ErrorEventListSerializer.Meta.fields + ["metadata"]


class FrontendErrorReportSerializer(serializers.Serializer):
    """Whitelist-only ingestion for frontend error reports. No request bodies,
    tokens, or form values are ever accepted."""
    message = serializers.CharField(max_length=2000, allow_blank=False)
    stack = serializers.CharField(max_length=10000, required=False, allow_blank=True, default="")
    url = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
    component = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    endpoint = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    method = serializers.CharField(max_length=10, required=False, allow_blank=True, default="")
    status_code = serializers.IntegerField(
        required=False, allow_null=True, min_value=100, max_value=599
    )
    severity = serializers.ChoiceField(
        choices=["LOW", "MEDIUM", "HIGH", "CRITICAL"], required=False, default="MEDIUM"
    )


class ErrorEventStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[s for s, _ in ErrorStatus.choices])


class AlertListSerializer(serializers.ModelSerializer):
    rule_code = serializers.CharField(source="rule.code", read_only=True)
    rule_name = serializers.CharField(source="rule.name", read_only=True)
    service = serializers.CharField(source="rule.service", read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id", "rule_code", "rule_name", "service", "status", "severity", "title",
            "message", "metric_value", "trigger_count", "first_triggered_at",
            "last_triggered_at", "acknowledged_at", "resolved_at", "resolution_note",
            "created_at", "updated_at",
        ]


class AlertDetailSerializer(AlertListSerializer):
    class Meta(AlertListSerializer.Meta):
        fields = AlertListSerializer.Meta.fields + ["incident"]


class AlertResolveSerializer(serializers.Serializer):
    resolution_note = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = [
            "id", "name", "code", "description", "service", "metric_type", "operator",
            "threshold", "window_minutes", "severity", "cooldown_minutes",
            "auto_resolve_minutes", "notify_permission", "create_incident",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_code(self, value):
        value = value.strip().lower().replace(" ", "_")
        if not value:
            raise serializers.ValidationError("Code is required.")
        return value


class IncidentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonitoringIncident
        fields = [
            "id", "title", "description", "severity", "status", "affected_service",
            "detected_at", "acknowledged_at", "resolved_at", "mtta_minutes",
            "mttr_minutes", "version", "created_at", "updated_at",
        ]


class IncidentDetailSerializer(IncidentListSerializer):
    timeline = serializers.JSONField(read_only=True)
    source_alert = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta(IncidentListSerializer.Meta):
        fields = IncidentListSerializer.Meta.fields + ["timeline", "source_alert", "resolution_notes"]


class IncidentNoteSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=2000, allow_blank=False)


class IncidentResolveSerializer(serializers.Serializer):
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")


class SLOSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceSLO
        fields = [
            "id", "name", "code", "description", "service", "slo_type", "target",
            "window_days", "evaluation_config", "is_contractual", "is_active",
            "latest_sli", "latest_error_budget_remaining", "evaluated_at",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "is_contractual", "latest_sli", "latest_error_budget_remaining", "evaluated_at",
            "created_at", "updated_at",
        ]


class MonitoringConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonitoringConfig
        fields = [
            "metrics_enabled", "request_logging_enabled", "latency_sample_rate",
            "slow_query_threshold_ms", "error_min_status", "celery_stuck_threshold_minutes",
            "retention_days",
        ]

    def validate_latency_sample_rate(self, value):
        if not (0 <= value <= 1):
            raise serializers.ValidationError("Sample rate must be between 0 and 1.")
        return value