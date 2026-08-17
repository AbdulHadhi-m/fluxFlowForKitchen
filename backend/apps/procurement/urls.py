from django.urls import path
from apps.procurement.views import (
    SupplierListCreateView,
    SupplierDetailView,
    SupplierContactListCreateView,
    SupplierItemListView,
    SupplierPerformanceScorecardView,
    PurchaseRequisitionListCreateView,
    PurchaseRequisitionSubmitView,
    PurchaseRequisitionApproveView,
    PurchaseOrderListCreateView,
    PurchaseOrderDetailView,
    PurchaseOrderSubmitView,
    PurchaseOrderApproveView,
    PurchaseOrderSendView,
    PurchaseOrderReceiveView,
    PurchaseOrderCancelView,
    PurchaseReturnListCreateView,
    PurchaseReturnApproveView,
    SupplierCreditListView,
    SupplierInvoiceListCreateView,
    ProcurementBudgetListCreateView,
    ProcurementRecommendationsView,
    ProcurementReportsView,
)

urlpatterns = [
    # Supplier Master & Items
    path("suppliers/", SupplierListCreateView.as_view(), name="supplier_list_create"),
    path("suppliers/<uuid:supplier_id>/", SupplierDetailView.as_view(), name="supplier_detail"),
    path("suppliers/<uuid:supplier_id>/contacts/", SupplierContactListCreateView.as_view(), name="supplier_contacts"),
    path("suppliers/<uuid:supplier_id>/items/", SupplierItemListView.as_view(), name="supplier_items"),
    path("suppliers/<uuid:supplier_id>/performance/", SupplierPerformanceScorecardView.as_view(), name="supplier_performance"),

    # Purchase Requisitions
    path("requisitions/", PurchaseRequisitionListCreateView.as_view(), name="requisition_list_create"),
    path("requisitions/<uuid:requisition_id>/submit/", PurchaseRequisitionSubmitView.as_view(), name="requisition_submit"),
    path("requisitions/<uuid:requisition_id>/approve/", PurchaseRequisitionApproveView.as_view(), name="requisition_approve"),

    # Purchase Orders
    path("purchase-orders/", PurchaseOrderListCreateView.as_view(), name="purchase_order_list_create"),
    path("purchase-orders/<uuid:po_id>/", PurchaseOrderDetailView.as_view(), name="purchase_order_detail"),
    path("purchase-orders/<uuid:po_id>/submit/", PurchaseOrderSubmitView.as_view(), name="purchase_order_submit"),
    path("purchase-orders/<uuid:po_id>/approve/", PurchaseOrderApproveView.as_view(), name="purchase_order_approve"),
    path("purchase-orders/<uuid:po_id>/send/", PurchaseOrderSendView.as_view(), name="purchase_order_send"),
    path("purchase-orders/<uuid:po_id>/receive/", PurchaseOrderReceiveView.as_view(), name="purchase_order_receive"),
    path("purchase-orders/<uuid:po_id>/cancel/", PurchaseOrderCancelView.as_view(), name="purchase_order_cancel"),

    # Returns & Credits
    path("returns/", PurchaseReturnListCreateView.as_view(), name="purchase_return_list_create"),
    path("returns/<uuid:return_id>/approve/", PurchaseReturnApproveView.as_view(), name="purchase_return_approve"),
    path("credits/", SupplierCreditListView.as_view(), name="supplier_credit_list"),

    # Invoices (3-Way Matching)
    path("invoices/", SupplierInvoiceListCreateView.as_view(), name="supplier_invoice_list_create"),

    # Budgets & Planning
    path("budgets/", ProcurementBudgetListCreateView.as_view(), name="procurement_budget_list_create"),
    path("recommendations/", ProcurementRecommendationsView.as_view(), name="procurement_recommendations"),
    path("reports/", ProcurementReportsView.as_view(), name="procurement_reports"),
]
