from django.urls import path
from apps.procurement.views import (
    SupplierListCreateView,
    SupplierDetailView,
    PurchaseOrderListCreateView,
    PurchaseOrderDetailView,
    PurchaseOrderSubmitView,
    PurchaseOrderApproveView,
    PurchaseOrderCancelView,
    PurchaseOrderReceiveView,
)

urlpatterns = [
    path("suppliers/", SupplierListCreateView.as_view(), name="supplier_list_create"),
    path("suppliers/<uuid:supplier_id>/", SupplierDetailView.as_view(), name="supplier_detail"),
    path("purchase-orders/", PurchaseOrderListCreateView.as_view(), name="purchase_order_list_create"),
    path("purchase-orders/<uuid:po_id>/", PurchaseOrderDetailView.as_view(), name="purchase_order_detail"),
    path("purchase-orders/<uuid:po_id>/submit/", PurchaseOrderSubmitView.as_view(), name="purchase_order_submit"),
    path("purchase-orders/<uuid:po_id>/approve/", PurchaseOrderApproveView.as_view(), name="purchase_order_approve"),
    path("purchase-orders/<uuid:po_id>/cancel/", PurchaseOrderCancelView.as_view(), name="purchase_order_cancel"),
    path("purchase-orders/<uuid:po_id>/receive/", PurchaseOrderReceiveView.as_view(), name="purchase_order_receive"),
]
