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


class ReportExportView(APIView):
    """
    Export full business analytics data as CSV/Excel files.
    """
    permission_classes = [IsAuthenticated, require_permission("reports.view")]

    @extend_schema(summary="Export Business Analytics Report")
    def get(self, request):
        import csv
        import io
        from django.http import HttpResponse

        restaurant = RestaurantService.get_user_restaurant(request.user)
        preset = request.query_params.get("preset", "LAST_7_DAYS")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        start_dt, end_dt = DateFilterHelper.get_range(preset, start_date, end_date)
        sales_report = ReportService.get_sales_report(restaurant, start_dt, end_dt)
        popular_items = ReportService.get_popular_items(restaurant, start_dt, end_dt, limit=50)

        output = io.StringIO()
        writer = csv.writer(output)

        # Header section
        writer.writerow(["FLUXIFLOW BUSINESS ANALYTICS REPORT"])
        writer.writerow(["Preset", preset, "Start Date", start_dt.strftime('%Y-%m-%d'), "End Date", end_dt.strftime('%Y-%m-%d')])
        writer.writerow([])

        # Financial Summary
        summary = sales_report["summary"]
        writer.writerow(["FINANCIAL SUMMARY"])
        writer.writerow(["Gross Sales", summary["gross_sales"]])
        writer.writerow(["Discounts", summary["discounts"]])
        writer.writerow(["Taxes", summary["tax"]])
        writer.writerow(["Net Sales", summary["net_sales"]])
        writer.writerow(["Total Paid", summary["total_paid"]])
        writer.writerow(["Balance Due", summary["balance_due"]])
        writer.writerow(["Average Order Value", summary["average_order_value"]])
        writer.writerow(["Total Invoices", summary["bill_count"]])
        writer.writerow([])

        # Daily Trends
        writer.writerow(["DAILY REVENUE TRAJECTORY"])
        writer.writerow(["Date", "Net Sales (INR)", "Gross Sales (INR)", "Total Paid (INR)", "Order Count"])
        for trend in sales_report["daily_trends"]:
            writer.writerow([trend["date"], trend["net_sales"], trend["gross_sales"], trend["total_paid"], trend["order_count"]])
        writer.writerow([])

        # Top Dishes
        writer.writerow(["TOP-SELLING DISHES"])
        writer.writerow(["Rank", "Item Name", "Quantity Sold", "Order Count", "Total Revenue (INR)"])
        for idx, item in enumerate(popular_items, 1):
            writer.writerow([idx, item["item_name"], item["quantity_sold"], item["order_count"], item["revenue"]])

        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="Fluxiflow_Analytics_{preset}_{start_dt.strftime("%Y%m%d")}.csv"'
        return response

