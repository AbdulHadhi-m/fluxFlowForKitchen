from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from apps.rbac.permissions import require_permission
from apps.restaurants.services import RestaurantService
from apps.reports.services import ReportService, DateFilterHelper

class DashboardReportView(APIView):
    """
    Overview operational dashboard metrics for executive view.
    """
    permission_classes = [IsAuthenticated, require_permission("reports.view")]

    @extend_schema(summary="Get Dashboard Summary Overview")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        preset = request.query_params.get("preset", "LAST_7_DAYS")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        start_dt, end_dt = DateFilterHelper.get_range(preset, start_date, end_date)
        data = ReportService.get_dashboard_summary(restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class SalesReportView(APIView):
    """
    Sales summary, gross revenue, deductions, taxes, and daily trend analysis.
    """
    permission_classes = [IsAuthenticated, require_permission("reports.view")]

    @extend_schema(summary="Get Sales & Revenue Report")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        preset = request.query_params.get("preset", "LAST_7_DAYS")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        start_dt, end_dt = DateFilterHelper.get_range(preset, start_date, end_date)
        data = ReportService.get_sales_report(restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class PaymentReportView(APIView):
    """
    Tender breakdown of settled payments (Cash, Card, UPI, etc.).
    """
    permission_classes = [IsAuthenticated, require_permission("reports.view")]

    @extend_schema(summary="Get Payment Methods Report")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        preset = request.query_params.get("preset", "LAST_7_DAYS")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        start_dt, end_dt = DateFilterHelper.get_range(preset, start_date, end_date)
        data = ReportService.get_payment_report(restaurant, start_dt, end_dt)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class PopularItemsReportView(APIView):
    """
    Best-selling catalog items ranked by quantity sold and revenue.
    """
    permission_classes = [IsAuthenticated, require_permission("reports.view")]

    @extend_schema(summary="Get Top Selling Menu Items")
    def get(self, request):
        restaurant = RestaurantService.get_user_restaurant(request.user)
        preset = request.query_params.get("preset", "LAST_7_DAYS")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        limit = int(request.query_params.get("limit", 10))

        start_dt, end_dt = DateFilterHelper.get_range(preset, start_date, end_date)
        data = ReportService.get_popular_items(restaurant, start_dt, end_dt, limit=limit)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)
