from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AccountViewSet,
    JournalEntryViewSet,
    CashSessionViewSet,
    BankAccountViewSet,
    BankTransactionViewSet,
    AccountsReceivableViewSet,
    AccountsPayableViewSet,
    ExpenseViewSet,
    FinancialPeriodViewSet,
    TrialBalanceView,
    ProfitLossView,
    BalanceSheetView,
    CashFlowView,
    GeneralLedgerView,
    FinanceDashboardView,
)

router = DefaultRouter()
router.register(r"accounts", AccountViewSet, basename="account")
router.register(r"journals", JournalEntryViewSet, basename="journal")
router.register(r"cash-sessions", CashSessionViewSet, basename="cash-session")
router.register(r"bank-accounts", BankAccountViewSet, basename="bank-account")
router.register(r"bank-transactions", BankTransactionViewSet, basename="bank-transaction")
router.register(r"receivables", AccountsReceivableViewSet, basename="receivable")
router.register(r"payables", AccountsPayableViewSet, basename="payable")
router.register(r"expenses", ExpenseViewSet, basename="expense")
router.register(r"periods", FinancialPeriodViewSet, basename="period")

urlpatterns = [
    path("trial-balance/", TrialBalanceView.as_view(), name="trial-balance"),
    path("profit-loss/", ProfitLossView.as_view(), name="profit-loss"),
    path("balance-sheet/", BalanceSheetView.as_view(), name="balance-sheet"),
    path("cash-flow/", CashFlowView.as_view(), name="cash-flow"),
    path("ledger/", GeneralLedgerView.as_view(), name="general-ledger"),
    path("dashboard/", FinanceDashboardView.as_view(), name="finance-dashboard"),
    path("", include(router.urls)),
]
