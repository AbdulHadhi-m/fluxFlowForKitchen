"""DRF serializers for Analytics models and request/response shapes."""
from rest_framework import serializers
from apps.analytics.models import (
    KPIDefinition, KPITarget, SavedDashboard, DashboardWidget,
    SavedReport, ScheduledReport, ReportExportJob,
    KPICategory, KPIDirection, WidgetType, ReportFrequency, ExportFormat,
)


class KPIDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = KPIDefinition
        fields = [
            "id", "name", "code", "description", "category", "formula", "unit",
            "direction", "default_target", "warning_threshold", "alert_enabled",
            "data_source", "refresh_frequency", "sort_order", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class KPITargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = KPITarget
        fields = [
            "id", "kpi", "restaurant", "period_start", "period_end",
            "target_value", "target_min", "target_max", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DashboardWidgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardWidget
        fields = [
            "id", "widget_type", "title", "data_source", "config",
            "position_x", "position_y", "width", "height", "sort_order",
        ]
        read_only_fields = ["id"]


class SavedDashboardSerializer(serializers.ModelSerializer):
    widgets = DashboardWidgetSerializer(many=True, read_only=True)

    class Meta:
        model = SavedDashboard
        fields = [
            "id", "name", "description", "is_default", "is_shared",
            "layout", "widgets", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SavedDashboardCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedDashboard
        fields = ["name", "description", "is_default", "is_shared", "layout"]


class SavedReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedReport
        fields = [
            "id", "name", "description", "report_type", "metrics", "dimensions",
            "filters", "date_range_preset", "sort_by", "sort_direction",
            "comparison_mode", "is_shared", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SavedReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedReport
        fields = [
            "name", "description", "report_type", "metrics", "dimensions",
            "filters", "date_range_preset", "sort_by", "sort_direction",
            "comparison_mode", "is_shared",
        ]

    def validate_metrics(self, value):
        if not value or not isinstance(value, list):
            raise serializers.ValidationError("At least one metric is required.")
        return value

    def validate_report_type(self, value):
        allowed = ["sales", "profitability", "inventory", "procurement", "labor",
                    "customers", "marketing", "loyalty", "delivery", "finance", "executive"]
        if value not in allowed:
            raise serializers.ValidationError(f"report_type must be one of: {', '.join(allowed)}")
        return value


class ScheduledReportSerializer(serializers.ModelSerializer):
    report_name = serializers.CharField(source="report.name", read_only=True)

    class Meta:
        model = ScheduledReport
        fields = [
            "id", "report", "report_name", "frequency", "export_format",
            "delivery_method", "recipients", "next_run_at", "last_run_at",
            "run_count", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "last_run_at", "run_count"]


class ScheduledReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduledReport
        fields = ["report", "frequency", "export_format", "delivery_method", "recipients", "next_run_at"]


class ReportExportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportExportJob
        fields = [
            "id", "report_type", "export_format", "status", "parameters",
            "file_path", "file_size_bytes", "error_message",
            "started_at", "completed_at", "created_at",
        ]
        read_only_fields = ["id", "status", "file_path", "file_size_bytes",
                            "error_message", "started_at", "completed_at", "created_at"]


class ScenarioRequestSerializer(serializers.Serializer):
    revenue_change_pct = serializers.DecimalField(max_digits=6, decimal_places=2, default=0)
    food_cost_change_pct = serializers.DecimalField(max_digits=6, decimal_places=2, default=0)
    labor_cost_change_pct = serializers.DecimalField(max_digits=6, decimal_places=2, default=0)
    supplier_price_change_pct = serializers.DecimalField(max_digits=6, decimal_places=2, default=0)


class ForecastRequestSerializer(serializers.Serializer):
    forecast_type = serializers.ChoiceField(choices=["sales", "demand", "inventory", "labor"], default="sales")
    horizon_days = serializers.IntegerField(min_value=1, max_value=90, default=7)
    lookback_weeks = serializers.IntegerField(min_value=2, max_value=52, default=8)
