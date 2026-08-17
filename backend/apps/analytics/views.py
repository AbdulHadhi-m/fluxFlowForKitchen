"""API views for Business Intelligence & Analytics."""
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.reports.services import DateFilterHelper
from apps.analytics.models import (
    KPIDefinition, KPITarget, SavedDashboard, DashboardWidget,
    SavedReport, ScheduledReport, ReportExportJob,
)
from apps.analytics.serializers import (
    KPIDefinitionSerializer, KPITargetSerializer,
    SavedDashboardSerializer, SavedDashboardCreateSerializer,
    DashboardWidgetSerializer,
    SavedReportSerializer, SavedReportCreateSerializer,
    ScheduledReportSerializer, ScheduledReportCreateSerializer,
    ReportExportJobSerializer, ScenarioRequestSerializer, ForecastRequestSerializer,
)
from apps.analytics.services import (
    ExecutiveDashboardService, SalesAnalyticsService, ProfitabilityAnalyticsService,
    MenuAnalyticsService, InventoryAnalyticsService, ProcurementAnalyticsService,
    LaborAnalyticsService, CustomerAnalyticsService, MarketingAnalyticsService,
    LoyaltyAnalyticsService, DeliveryAnalyticsService, SupportAnalyticsService,
    FinancialAnalyticsService, MultiLocationService, DataQualityService,
)
from apps.analytics.kpi_engine import KPIEngine
from apps.analytics.forecasting import (
    SalesForecastService, DemandForecastService, InventoryDemandForecastService,
    LaborForecastService, ScenarioAnalysisService,
)


def _get_restaurant(request):
    return RestaurantService.get_user_restaurant(request.user)


def _get_date_range(request):
    preset = request.query_params.get("preset", "LAST_30_DAYS")
    start = request.query_params.get("start_date")
    end = request.query_params.get("end_date")
    return DateFilterHelper.get_range(preset, start, end)


# ──────────────────────────────────────────────────────────────────────
# EXECUTIVE DASHBOARD
# ──────────────────────────────────────────────────────────────────────

class ExecutiveDashboardView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.executive")]

    @extend_schema(summary="Executive Dashboard Summary")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        data = ExecutiveDashboardService.get_executive_summary(restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data})


# ──────────────────────────────────────────────────────────────────────
# DOMAIN ANALYTICS VIEWS
# ──────────────────────────────────────────────────────────────────────

class SalesAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Sales Analytics")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        view_type = request.query_params.get("view", "summary")

        if view_type == "trend":
            data = SalesAnalyticsService.get_daily_trend(restaurant, start_dt, end_dt)
        elif view_type == "heatmap":
            data = SalesAnalyticsService.get_hourly_heatmap(restaurant, start_dt, end_dt)
        elif view_type == "category":
            data = SalesAnalyticsService.get_by_category(restaurant, start_dt, end_dt)
        elif view_type == "channel":
            data = SalesAnalyticsService.get_by_channel(restaurant, start_dt, end_dt)
        elif view_type == "comparison":
            data = SalesAnalyticsService.get_period_comparison(restaurant, start_dt, end_dt)
        else:
            data = SalesAnalyticsService.get_summary(restaurant, start_dt, end_dt)

        return Response({"success": True, "data": data})


class ProfitabilityAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.finance")]

    @extend_schema(summary="Profitability Analytics")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        data = ProfitabilityAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data})


class MenuAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Menu Analytics & Engineering")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        view_type = request.query_params.get("view", "items")

        if view_type == "engineering":
            data = MenuAnalyticsService.get_menu_engineering(restaurant, start_dt, end_dt)
        else:
            data = MenuAnalyticsService.get_item_analytics(restaurant, start_dt, end_dt)

        return Response({"success": True, "data": data})


class InventoryAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Inventory Analytics")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        view_type = request.query_params.get("view", "summary")

        if view_type == "waste":
            data = InventoryAnalyticsService.get_waste_analytics(restaurant, start_dt, end_dt)
        elif view_type == "turnover":
            data = InventoryAnalyticsService.get_turnover(restaurant, start_dt, end_dt)
        elif view_type == "slow_movers":
            data = InventoryAnalyticsService.get_slow_movers(restaurant)
        else:
            data = InventoryAnalyticsService.get_summary(restaurant)

        return Response({"success": True, "data": data})


class ProcurementAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Procurement & Supplier Analytics")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        view_type = request.query_params.get("view", "summary")

        if view_type == "suppliers":
            data = ProcurementAnalyticsService.get_supplier_ranking(restaurant, start_dt, end_dt)
        elif view_type == "price_variance":
            data = ProcurementAnalyticsService.get_price_variance(restaurant)
        else:
            data = ProcurementAnalyticsService.get_summary(restaurant, start_dt, end_dt)

        return Response({"success": True, "data": data})


class LaborAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.hr")]

    @extend_schema(summary="Labor & Staffing Analytics")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        view_type = request.query_params.get("view", "summary")

        if view_type == "staffing":
            data = LaborAnalyticsService.get_staffing_analysis(restaurant)
        else:
            data = LaborAnalyticsService.get_summary(restaurant, start_dt, end_dt)

        return Response({"success": True, "data": data})


class CustomerAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Customer Analytics & Cohorts")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        view_type = request.query_params.get("view", "summary")

        if view_type == "cohorts":
            data = CustomerAnalyticsService.get_cohort_analysis(restaurant)
        elif view_type == "retention":
            data = CustomerAnalyticsService.get_retention(restaurant, start_dt, end_dt)
        else:
            data = CustomerAnalyticsService.get_summary(restaurant, start_dt, end_dt)

        return Response({"success": True, "data": data})


class MarketingAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Marketing & Campaign Analytics")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        data = MarketingAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data})


class LoyaltyAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Loyalty Program Analytics")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        data = LoyaltyAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data})


class DeliveryAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Delivery Performance Analytics")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        data = DeliveryAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data})


class SupportAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Support & Feedback Analytics")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        data = SupportAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data})


class FinancialAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.finance")]

    @extend_schema(summary="Financial Analytics")
    def get(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        data = FinancialAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data})


class DataQualityView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Data Quality Report")
    def get(self, request):
        restaurant = _get_restaurant(request)
        data = DataQualityService.get_quality_report(restaurant)
        return Response({"success": True, "data": data})


# ──────────────────────────────────────────────────────────────────────
# KPI MANAGEMENT
# ──────────────────────────────────────────────────────────────────────

class KPIListCreateView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.manage")]

    @extend_schema(summary="List KPIs")
    def get(self, request):
        restaurant = _get_restaurant(request)
        kpis = KPIDefinition.objects.filter(restaurant=restaurant, is_active=True)
        category = request.query_params.get("category")
        if category:
            kpis = kpis.filter(category=category.upper())
        serializer = KPIDefinitionSerializer(kpis, many=True)
        return Response({"success": True, "data": serializer.data})

    @extend_schema(summary="Create KPI")
    def post(self, request):
        restaurant = _get_restaurant(request)
        serializer = KPIDefinitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(restaurant=restaurant)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)


class KPIDetailView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.manage")]

    @extend_schema(summary="Update KPI")
    def patch(self, request, pk):
        restaurant = _get_restaurant(request)
        try:
            kpi = KPIDefinition.objects.get(id=pk, restaurant=restaurant)
        except KPIDefinition.DoesNotExist:
            return Response({"success": False, "error": "KPI not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = KPIDefinitionSerializer(kpi, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "data": serializer.data})


class KPIPerformanceView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="KPI Performance (Actual vs Target)")
    def get(self, request, pk=None):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)

        if pk:
            try:
                kpi = KPIDefinition.objects.get(id=pk, restaurant=restaurant)
            except KPIDefinition.DoesNotExist:
                return Response({"success": False, "error": "KPI not found"}, status=status.HTTP_404_NOT_FOUND)
            data = KPIEngine.get_kpi_performance(kpi, restaurant, start_dt, end_dt)
        else:
            data = KPIEngine.evaluate_all_kpis(restaurant, start_dt, end_dt)

        return Response({"success": True, "data": data})


class KPITargetListCreateView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.manage")]

    @extend_schema(summary="List/Create KPI Targets")
    def get(self, request):
        restaurant = _get_restaurant(request)
        targets = KPITarget.objects.filter(restaurant=restaurant).select_related("kpi")
        serializer = KPITargetSerializer(targets, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        restaurant = _get_restaurant(request)
        serializer = KPITargetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(restaurant=restaurant)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────────────────────────────
# FORECASTING & SCENARIOS
# ──────────────────────────────────────────────────────────────────────

class ForecastView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.forecast")]

    @extend_schema(summary="Generate Forecast")
    def get(self, request):
        restaurant = _get_restaurant(request)
        forecast_type = request.query_params.get("type", "sales")
        horizon = int(request.query_params.get("horizon_days", 7))
        lookback = int(request.query_params.get("lookback_weeks", 8))

        if forecast_type == "sales":
            data = SalesForecastService.forecast_daily(restaurant, horizon, lookback)
        elif forecast_type == "demand":
            data = DemandForecastService.forecast_item_demand(restaurant, horizon, lookback)
        elif forecast_type == "inventory":
            data = InventoryDemandForecastService.forecast_ingredient_demand(restaurant, horizon, lookback)
        elif forecast_type == "labor":
            data = LaborForecastService.forecast(restaurant, horizon, lookback)
        else:
            return Response({"success": False, "error": "Invalid forecast type"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"success": True, "data": data})

    @extend_schema(summary="Generate Forecast (POST)")
    def post(self, request):
        serializer = ForecastRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        restaurant = _get_restaurant(request)
        d = serializer.validated_data
        return self._run_forecast(restaurant, d["forecast_type"], d["horizon_days"], d["lookback_weeks"])

    def _run_forecast(self, restaurant, forecast_type, horizon, lookback):
        if forecast_type == "sales":
            data = SalesForecastService.forecast_daily(restaurant, horizon, lookback)
        elif forecast_type == "demand":
            data = DemandForecastService.forecast_item_demand(restaurant, horizon, lookback)
        elif forecast_type == "inventory":
            data = InventoryDemandForecastService.forecast_ingredient_demand(restaurant, horizon, lookback)
        elif forecast_type == "labor":
            data = LaborForecastService.forecast(restaurant, horizon, lookback)
        else:
            return Response({"success": False, "error": "Invalid forecast type"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"success": True, "data": data})


class ScenarioView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.forecast")]

    @extend_schema(summary="Run What-If Scenario")
    def post(self, request):
        restaurant = _get_restaurant(request)
        start_dt, end_dt = _get_date_range(request)
        serializer = ScenarioRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        data = ScenarioAnalysisService.run_scenario(
            restaurant, start_dt, end_dt,
            revenue_change_pct=d["revenue_change_pct"],
            food_cost_change_pct=d["food_cost_change_pct"],
            labor_cost_change_pct=d["labor_cost_change_pct"],
            supplier_price_change_pct=d["supplier_price_change_pct"],
        )
        return Response({"success": True, "data": data})

    @extend_schema(summary="List scenario presets")
    def get(self, request):
        presets = [
            {"label": "Sales +10%", "revenue_change_pct": "10.00"},
            {"label": "Sales -10%", "revenue_change_pct": "-10.00"},
            {"label": "Food Cost +5%", "food_cost_change_pct": "5.00"},
            {"label": "Labor Cost +8%", "labor_cost_change_pct": "8.00"},
            {"label": "Supplier Price +5%", "supplier_price_change_pct": "5.00"},
        ]
        return Response({"success": True, "data": presets})


# ──────────────────────────────────────────────────────────────────────
# DASHBOARDS
# ──────────────────────────────────────────────────────────────────────

class DashboardListCreateView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.manage")]

    @extend_schema(summary="List Dashboards")
    def get(self, request):
        restaurant = _get_restaurant(request)
        dashboards = SavedDashboard.objects.filter(
            restaurant=restaurant, is_active=True
        ).filter(Q(created_by=request.user) | Q(is_shared=True))
        serializer = SavedDashboardSerializer(dashboards, many=True)
        return Response({"success": True, "data": serializer.data})

    @extend_schema(summary="Create Dashboard")
    def post(self, request):
        restaurant = _get_restaurant(request)
        serializer = SavedDashboardCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(restaurant=restaurant, created_by=request.user)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)


class DashboardDetailView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.manage")]

    @extend_schema(summary="Update Dashboard")
    def patch(self, request, pk):
        restaurant = _get_restaurant(request)
        try:
            dashboard = SavedDashboard.objects.get(id=pk, restaurant=restaurant)
        except SavedDashboard.DoesNotExist:
            return Response({"success": False, "error": "Dashboard not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = SavedDashboardCreateSerializer(dashboard, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "data": SavedDashboardSerializer(dashboard).data})

    @extend_schema(summary="Delete Dashboard")
    def delete(self, request, pk):
        restaurant = _get_restaurant(request)
        try:
            dashboard = SavedDashboard.objects.get(id=pk, restaurant=restaurant)
        except SavedDashboard.DoesNotExist:
            return Response({"success": False, "error": "Dashboard not found"}, status=status.HTTP_404_NOT_FOUND)
        dashboard.is_active = False
        dashboard.save(update_fields=["is_active"])
        return Response({"success": True}, status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────────────────────────────────────────────────
# SAVED REPORTS & SCHEDULING
# ──────────────────────────────────────────────────────────────────────

class ReportListCreateView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.manage")]

    @extend_schema(summary="List Saved Reports")
    def get(self, request):
        restaurant = _get_restaurant(request)
        reports = SavedReport.objects.filter(
            restaurant=restaurant, is_active=True
        ).filter(Q(created_by=request.user) | Q(is_shared=True))
        serializer = SavedReportSerializer(reports, many=True)
        return Response({"success": True, "data": serializer.data})

    @extend_schema(summary="Create Saved Report")
    def post(self, request):
        restaurant = _get_restaurant(request)
        serializer = SavedReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(restaurant=restaurant, created_by=request.user)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)


class ReportRunView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.view")]

    @extend_schema(summary="Run a Saved Report")
    def post(self, request, pk):
        restaurant = _get_restaurant(request)
        try:
            report = SavedReport.objects.get(id=pk, restaurant=restaurant, is_active=True)
        except SavedReport.DoesNotExist:
            return Response({"success": False, "error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

        # Build date range from report config
        start_dt, end_dt = DateFilterHelper.get_range(
            report.date_range_preset,
            request.data.get("start_date"),
            request.data.get("end_date"),
        )

        # Dispatch to appropriate analytics service
        data = cls._execute_report(report, restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data})

    @staticmethod
    def _execute_report(report, restaurant, start_dt, end_dt):
        rt = report.report_type
        if rt == "sales":
            return SalesAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        elif rt == "profitability":
            return ProfitabilityAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        elif rt == "inventory":
            return InventoryAnalyticsService.get_summary(restaurant)
        elif rt == "procurement":
            return ProcurementAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        elif rt == "labor":
            return LaborAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        elif rt == "customers":
            return CustomerAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        elif rt == "marketing":
            return MarketingAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        elif rt == "loyalty":
            return LoyaltyAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        elif rt == "delivery":
            return DeliveryAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        elif rt == "finance":
            return FinancialAnalyticsService.get_summary(restaurant, start_dt, end_dt)
        elif rt == "executive":
            return ExecutiveDashboardService.get_executive_summary(restaurant, start_dt, end_dt)
        return {"error": f"Unknown report type: {rt}"}


class ReportExportView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.export")]

    @extend_schema(summary="Export Report (Async)")
    def post(self, request, pk):
        restaurant = _get_restaurant(request)
        try:
            report = SavedReport.objects.get(id=pk, restaurant=restaurant, is_active=True)
        except SavedReport.DoesNotExist:
            return Response({"success": False, "error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

        export_format = request.data.get("format", "CSV").upper()
        if export_format not in ["CSV", "XLSX", "PDF"]:
            return Response({"success": False, "error": "Invalid format"}, status=status.HTTP_400_BAD_REQUEST)

        job = ReportExportJob.objects.create(
            restaurant=restaurant,
            requested_by=request.user,
            report=report,
            report_type=report.report_type,
            export_format=export_format,
            parameters={
                "date_range_preset": report.date_range_preset,
                "metrics": report.metrics,
                "filters": report.filters,
            },
        )

        # Dispatch Celery task
        try:
            from apps.analytics.tasks import export_report_async
            export_report_async.delay(str(job.id))
        except Exception:
            pass  # Celery may not be available in dev

        serializer = ReportExportJobSerializer(job)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_202_ACCEPTED)


class ScheduledReportListCreateView(APIView):
    permission_classes = [IsAuthenticated, require_permission("analytics.manage")]

    @extend_schema(summary="List Scheduled Reports")
    def get(self, request):
        restaurant = _get_restaurant(request)
        schedules = ScheduledReport.objects.filter(restaurant=restaurant, is_active=True)
        serializer = ScheduledReportSerializer(schedules, many=True)
        return Response({"success": True, "data": serializer.data})

    @extend_schema(summary="Create Scheduled Report")
    def post(self, request):
        restaurant = _get_restaurant(request)
        serializer = ScheduledReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(restaurant=restaurant, created_by=request.user)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)
