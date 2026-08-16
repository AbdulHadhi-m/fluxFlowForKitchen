from django.urls import path
from apps.billing.views import (
    BillListCreateView,
    BillDetailView,
    BillProcessPaymentView,
    BillVoidView,
    EligibleOrdersForBillingView,
    TaxRuleListCreateView,
)

urlpatterns = [
    path("bills/", BillListCreateView.as_view(), name="bill_list_create"),
    path("bills/<uuid:bill_id>/", BillDetailView.as_view(), name="bill_detail"),
    path("bills/<uuid:bill_id>/payments/", BillProcessPaymentView.as_view(), name="bill_process_payment"),
    path("bills/<uuid:bill_id>/void/", BillVoidView.as_view(), name="bill_void"),
    path("eligible-orders/", EligibleOrdersForBillingView.as_view(), name="billing_eligible_orders"),
    path("tax-rules/", TaxRuleListCreateView.as_view(), name="billing_tax_rules"),
]
