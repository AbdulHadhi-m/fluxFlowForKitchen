from django.urls import path
from apps.reports.views import (
    DashboardReportView,
    SalesReportView,
    PaymentReportView,
    PopularItemsReportView,
    ReportExportView,
)

urlpatterns = [
    path("dashboard/", DashboardReportView.as_view(), name="report_dashboard"),
    path("sales/", SalesReportView.as_view(), name="report_sales"),
    path("payments/", PaymentReportView.as_view(), name="report_payments"),
    path("menu/popular/", PopularItemsReportView.as_view(), name="report_popular_menu"),
    path("export/", ReportExportView.as_view(), name="report_export"),
]
