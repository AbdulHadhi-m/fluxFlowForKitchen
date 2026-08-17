"""URL routing for /api/v1/analytics/."""
from django.urls import path
from apps.analytics.views import (
    ExecutiveDashboardView,
    SalesAnalyticsView, ProfitabilityAnalyticsView, MenuAnalyticsView,
    InventoryAnalyticsView, ProcurementAnalyticsView, LaborAnalyticsView,
    CustomerAnalyticsView, MarketingAnalyticsView, LoyaltyAnalyticsView,
    DeliveryAnalyticsView, SupportAnalyticsView, FinancialAnalyticsView,
    DataQualityView,
    KPIListCreateView, KPIDetailView, KPIPerformanceView, KPITargetListCreateView,
    ForecastView, ScenarioView,
    DashboardListCreateView, DashboardDetailView,
    ReportListCreateView, ReportRunView, ReportExportView,
    ScheduledReportListCreateView,
)

urlpatterns = [
    # Executive
    path("executive/", ExecutiveDashboardView.as_view(), name="analytics_executive"),

    # Domain Analytics
    path("sales/", SalesAnalyticsView.as_view(), name="analytics_sales"),
    path("profitability/", ProfitabilityAnalyticsView.as_view(), name="analytics_profitability"),
    path("menu/", MenuAnalyticsView.as_view(), name="analytics_menu"),
    path("inventory/", InventoryAnalyticsView.as_view(), name="analytics_inventory"),
    path("procurement/", ProcurementAnalyticsView.as_view(), name="analytics_procurement"),
    path("labor/", LaborAnalyticsView.as_view(), name="analytics_labor"),
    path("customers/", CustomerAnalyticsView.as_view(), name="analytics_customers"),
    path("marketing/", MarketingAnalyticsView.as_view(), name="analytics_marketing"),
    path("loyalty/", LoyaltyAnalyticsView.as_view(), name="analytics_loyalty"),
    path("delivery/", DeliveryAnalyticsView.as_view(), name="analytics_delivery"),
    path("support/", SupportAnalyticsView.as_view(), name="analytics_support"),
    path("finance/", FinancialAnalyticsView.as_view(), name="analytics_finance"),
    path("data-quality/", DataQualityView.as_view(), name="analytics_data_quality"),

    # KPIs
    path("kpis/", KPIListCreateView.as_view(), name="analytics_kpis"),
    path("kpis/<uuid:pk>/", KPIDetailView.as_view(), name="analytics_kpi_detail"),
    path("kpis/<uuid:pk>/performance/", KPIPerformanceView.as_view(), name="analytics_kpi_performance"),
    path("kpis/performance/", KPIPerformanceView.as_view(), name="analytics_kpis_performance_all"),
    path("kpi-targets/", KPITargetListCreateView.as_view(), name="analytics_kpi_targets"),

    # Forecasting & Scenarios
    path("forecasts/", ForecastView.as_view(), name="analytics_forecasts"),
    path("scenarios/", ScenarioView.as_view(), name="analytics_scenarios"),

    # Dashboards
    path("dashboards/", DashboardListCreateView.as_view(), name="analytics_dashboards"),
    path("dashboards/<uuid:pk>/", DashboardDetailView.as_view(), name="analytics_dashboard_detail"),

    # Reports
    path("reports/", ReportListCreateView.as_view(), name="analytics_reports"),
    path("reports/<uuid:pk>/run/", ReportRunView.as_view(), name="analytics_report_run"),
    path("reports/<uuid:pk>/export/", ReportExportView.as_view(), name="analytics_report_export"),

    # Scheduled Reports
    path("scheduled-reports/", ScheduledReportListCreateView.as_view(), name="analytics_scheduled_reports"),
]
