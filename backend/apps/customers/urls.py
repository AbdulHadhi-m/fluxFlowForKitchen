from django.urls import path
from apps.customers.views import (
    CustomerListCreateView,
    CustomerDetailView,
    CustomerMergeView,
    CustomerAnalyticsView,
    CustomerTagListCreateView,
    ReservationListCreateView,
    ReservationDetailView,
)

urlpatterns = [
    path("customers/", CustomerListCreateView.as_view(), name="customer-list-create"),
    path("customers/analytics/", CustomerAnalyticsView.as_view(), name="customer-analytics"),
    path("customers/tags/", CustomerTagListCreateView.as_view(), name="customer-tag-list-create"),
    path("customers/<uuid:pk>/", CustomerDetailView.as_view(), name="customer-detail"),
    path("customers/<uuid:pk>/merge/", CustomerMergeView.as_view(), name="customer-merge"),
    path("reservations/", ReservationListCreateView.as_view(), name="reservation-list-create"),
    path("reservations/<uuid:pk>/", ReservationDetailView.as_view(), name="reservation-detail"),
]
