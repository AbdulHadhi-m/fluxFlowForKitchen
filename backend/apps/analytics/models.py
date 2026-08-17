"""
Analytics models for KPI management, custom dashboards, saved reports, scheduled reports, and export jobs.
These are BI-layer models only. Domain data lives in its respective app.
"""
import uuid
from django.db import models
from django.conf import settings
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant


class KPICategory(models.TextChoices):
    SALES = "SALES", "Sales"
    FINANCE = "FINANCE", "Finance"
    OPERATIONS = "OPERATIONS", "Operations"
    INVENTORY = "INVENTORY", "Inventory"
    PROCUREMENT = "PROCUREMENT", "Procurement"
    CUSTOMERS = "CUSTOMERS", "Customers"
    MARKETING = "MARKETING", "Marketing"
    HR = "HR", "Human Resources"
    DELIVERY = "DELIVERY", "Delivery"
    SUPPORT = "SUPPORT", "Support"


class KPIDirection(models.TextChoices):
    HIGHER_IS_BETTER = "HIGHER_IS_BETTER", "Higher is Better"
    LOWER_IS_BETTER = "LOWER_IS_BETTER", "Lower is Better"
    TARGET_RANGE = "TARGET_RANGE", "Target Range"
    EXACT_TARGET = "EXACT_TARGET", "Exact Target"


class KPIStatus(models.TextChoices):
    ON_TARGET = "ON_TARGET", "On Target"
    ABOVE_TARGET = "ABOVE_TARGET", "Above Target"
    BELOW_TARGET = "BELOW_TARGET", "Below Target"
    AT_RISK = "AT_RISK", "At Risk"


class DataFreshness(models.TextChoices):
    REAL_TIME = "REAL_TIME", "Real-Time"
    NEAR_REAL_TIME = "NEAR_REAL_TIME", "Near Real-Time"
    SCHEDULED = "SCHEDULED", "Scheduled"
    CACHED = "CACHED", "Cached"


class DataQualityStatus(models.TextChoices):
    HEALTHY = "HEALTHY", "Healthy"
    WARNING = "WARNING", "Warning"
    ERROR = "ERROR", "Error"
    STALE = "STALE", "Stale"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA", "Insufficient Data"


class WidgetType(models.TextChoices):
    KPI_CARD = "KPI_CARD", "KPI Card"
    LINE_CHART = "LINE_CHART", "Line Chart"
    BAR_CHART = "BAR_CHART", "Bar Chart"
    AREA_CHART = "AREA_CHART", "Area Chart"
    TABLE = "TABLE", "Table"
    RANKING = "RANKING", "Ranking"
    HEATMAP = "HEATMAP", "Heatmap"
    COMPARISON = "COMPARISON", "Comparison"
    FUNNEL = "FUNNEL", "Funnel"


class ReportFrequency(models.TextChoices):
    DAILY = "DAILY", "Daily"
    WEEKLY = "WEEKLY", "Weekly"
    MONTHLY = "MONTHLY", "Monthly"
    CUSTOM = "CUSTOM", "Custom"


class ExportFormat(models.TextChoices):
    CSV = "CSV", "CSV"
    XLSX = "XLSX", "XLSX"
    PDF = "PDF", "PDF"


class ExportStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


class MenuClassification(models.TextChoices):
    STAR = "STAR", "Star (High Popularity, High Profitability)"
    PLOWHORSE = "PLOWHORSE", "Plowhorse (High Popularity, Low Profitability)"
    PUZZLE = "PUZZLE", "Puzzle (Low Popularity, High Profitability)"
    DOG = "DOG", "Dog (Low Popularity, Low Profitability)"


# ──────────────────────────────────────────────────────────────────────
# KPI FRAMEWORK
# ──────────────────────────────────────────────────────────────────────

class KPIDefinition(UUIDModel, TimeStampedModel, StatusModel):
    """Configurable KPI metadata definition."""
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="kpi_definitions")
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=60, db_index=True, help_text="Unique code per restaurant, e.g. FOOD_COST_PCT")
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=30, choices=KPICategory.choices)
    formula = models.CharField(max_length=255, blank=True, default="", help_text="Human-readable formula description")
    unit = models.CharField(max_length=20, default="", blank=True, help_text="%, $, units, hours, etc.")
    direction = models.CharField(max_length=30, choices=KPIDirection.choices, default=KPIDirection.LOWER_IS_BETTER)
    default_target = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    warning_threshold = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True,
                                            help_text="Deviation % that triggers AT_RISK status")
    alert_enabled = models.BooleanField(default=False)
    data_source = models.CharField(max_length=120, blank=True, default="", help_text="Service method reference")
    refresh_frequency = models.CharField(max_length=30, choices=DataFreshness.choices, default=DataFreshness.NEAR_REAL_TIME)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["category", "sort_order", "name"]
        unique_together = [("restaurant", "code")]

    def __str__(self):
        return f"{self.name} ({self.code})"


class KPITarget(UUIDModel, TimeStampedModel):
    """Period-specific KPI targets per restaurant."""
    kpi = models.ForeignKey(KPIDefinition, on_delete=models.CASCADE, related_name="targets")
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="kpi_targets")
    period_start = models.DateField()
    period_end = models.DateField()
    target_value = models.DecimalField(max_digits=14, decimal_places=4)
    target_min = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True,
                                     help_text="For TARGET_RANGE direction")
    target_max = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True,
                                     help_text="For TARGET_RANGE direction")
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-period_start"]

    def __str__(self):
        return f"{self.kpi.code} target: {self.target_value} ({self.period_start} to {self.period_end})"


# ──────────────────────────────────────────────────────────────────────
# CUSTOM DASHBOARDS
# ──────────────────────────────────────────────────────────────────────

class SavedDashboard(UUIDModel, TimeStampedModel, StatusModel):
    """User-configurable dashboard."""
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="saved_dashboards")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_dashboards")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    is_default = models.BooleanField(default=False)
    is_shared = models.BooleanField(default=False, help_text="Visible to all restaurant users")
    layout = models.JSONField(default=dict, blank=True, help_text="Dashboard grid layout configuration")

    class Meta:
        ordering = ["-is_default", "-updated_at"]

    def __str__(self):
        return self.name


class DashboardWidget(UUIDModel, TimeStampedModel):
    """Widget configuration within a dashboard."""
    dashboard = models.ForeignKey(SavedDashboard, on_delete=models.CASCADE, related_name="widgets")
    widget_type = models.CharField(max_length=30, choices=WidgetType.choices)
    title = models.CharField(max_length=120)
    data_source = models.CharField(max_length=120, help_text="Analytics endpoint/service reference")
    config = models.JSONField(default=dict, blank=True, help_text="Widget-specific configuration (filters, params)")
    position_x = models.PositiveIntegerField(default=0)
    position_y = models.PositiveIntegerField(default=0)
    width = models.PositiveIntegerField(default=4, help_text="Grid columns (1-12)")
    height = models.PositiveIntegerField(default=3, help_text="Grid rows")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "position_y", "position_x"]

    def __str__(self):
        return f"{self.title} ({self.widget_type})"


# ──────────────────────────────────────────────────────────────────────
# REPORT BUILDER & SCHEDULING
# ──────────────────────────────────────────────────────────────────────

class SavedReport(UUIDModel, TimeStampedModel, StatusModel):
    """User-saved report builder configuration."""
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="saved_reports")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_reports")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    report_type = models.CharField(max_length=60, help_text="e.g. sales, profitability, inventory, labor")
    metrics = models.JSONField(default=list, help_text="Selected metrics")
    dimensions = models.JSONField(default=list, help_text="Grouping dimensions")
    filters = models.JSONField(default=dict, blank=True, help_text="Filter configuration")
    date_range_preset = models.CharField(max_length=30, default="LAST_30_DAYS")
    sort_by = models.CharField(max_length=60, blank=True, default="")
    sort_direction = models.CharField(max_length=4, default="desc")
    comparison_mode = models.CharField(max_length=30, blank=True, default="", help_text="previous_period, previous_year, target, budget")
    is_shared = models.BooleanField(default=False)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class ScheduledReport(UUIDModel, TimeStampedModel, StatusModel):
    """Scheduled report generation definition."""
    report = models.ForeignKey(SavedReport, on_delete=models.CASCADE, related_name="schedules")
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="scheduled_reports")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    frequency = models.CharField(max_length=20, choices=ReportFrequency.choices)
    export_format = models.CharField(max_length=10, choices=ExportFormat.choices, default=ExportFormat.CSV)
    delivery_method = models.CharField(max_length=20, default="IN_APP", help_text="IN_APP, EMAIL, DOWNLOAD")
    recipients = models.JSONField(default=list, blank=True, help_text="User IDs or email addresses")
    next_run_at = models.DateTimeField(null=True, blank=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    run_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["next_run_at"]

    def __str__(self):
        return f"Schedule: {self.report.name} ({self.frequency})"


class ReportExportJob(UUIDModel, TimeStampedModel):
    """Async export job tracking for large reports."""
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="export_jobs")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    report = models.ForeignKey(SavedReport, on_delete=models.SET_NULL, null=True, blank=True)
    report_type = models.CharField(max_length=60, help_text="Analytics type being exported")
    export_format = models.CharField(max_length=10, choices=ExportFormat.choices)
    status = models.CharField(max_length=20, choices=ExportStatus.choices, default=ExportStatus.PENDING)
    parameters = models.JSONField(default=dict, blank=True, help_text="Query parameters snapshot")
    file_path = models.CharField(max_length=500, blank=True, default="")
    file_size_bytes = models.BigIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Export {self.report_type} ({self.status})"
