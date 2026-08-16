from django.urls import path
from apps.orders.views import (
    OrderListCreateView,
    OrderDetailView,
    OrderCancelView,
    OrderCompleteView,
    OrderItemListCreateView,
    OrderItemDetailView,
)

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="order_list_create"),
    path("<uuid:order_id>/", OrderDetailView.as_view(), name="order_detail"),
    path("<uuid:order_id>/cancel/", OrderCancelView.as_view(), name="order_cancel"),
    path("<uuid:order_id>/complete/", OrderCompleteView.as_view(), name="order_complete"),
    path("<uuid:order_id>/items/", OrderItemListCreateView.as_view(), name="order_item_list_create"),
    path("<uuid:order_id>/items/<uuid:item_id>/", OrderItemDetailView.as_view(), name="order_item_detail"),
]
