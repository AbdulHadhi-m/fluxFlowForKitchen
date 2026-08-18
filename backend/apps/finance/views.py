from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Q
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.rbac.permissions import HasActivePermission
from apps.restaurants.models import Restaurant
from .models import (
    Account,
    AccountCategory,
    FinancialPeriod,
    JournalEntry,
    JournalLine,
    CashSession,
    CashTransaction,
    BankAccount,
    BankTransaction,
    AccountsReceivable,
    AccountsPayable,
    Expense,
)
from .serializers import (
    AccountSerializer,
    JournalEntrySerializer,
    CashSessionSerializer,
    CashTransactionSerializer,
    BankAccountSerializer,
    BankTransactionSerializer,
    AccountsReceivableSerializer,
    AccountsPayableSerializer,
    ExpenseSerializer,
    FinancialPeriodSerializer,
)
from .services import (
    ChartOfAccountsService,
    DoubleEntryAccountingService,
    CashManagementService,
    FinancialReportingService,
)


def _get_restaurant(request) -> Restaurant:
    if hasattr(request, "tenant") and request.tenant:
        return request.tenant
    restaurant_id = request.headers.get("X-Restaurant-ID") or request.query_params.get("restaurant_id")
    if restaurant_id:
        return Restaurant.objects.filter(id=restaurant_id).first()
    membership = request.user.memberships.first()
    if membership and membership.tenant_id:
        return Restaurant.objects.filter(id=membership.tenant_id).first()
    return Restaurant.objects.first()


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return Account.objects.none()
        category = self.request.query_params.get("category")
        qs = Account.objects.filter(restaurant=restaurant)
        if category:
            qs = qs.filter(category=category)
        return qs.order_by("code")

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)

    @action(detail=False, methods=["post"], url_path="seed-defaults")
    def seed_defaults(self, request):
        restaurant = _get_restaurant(request)
        accounts = ChartOfAccountsService.seed_default_chart_of_accounts(restaurant)
        return Response(AccountSerializer(accounts, many=True).data, status=status.HTTP_201_CREATED)


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return JournalEntry.objects.none()
        qs = JournalEntry.objects.filter(restaurant=restaurant)
        entry_status = self.request.query_params.get("status")
        if entry_status:
            qs = qs.filter(status=entry_status)
        return qs.order_by("-entry_date", "-created_at")

    def create(self, request, *args, **kwargs):
        restaurant = _get_restaurant(request)
        entry_date = request.data.get("entry_date") or timezone.now().date()
        source_document_type = request.data.get("source_document_type", "MANUAL")
        lines = request.data.get("lines", [])
        notes = request.data.get("notes", "")
        auto_post = bool(request.data.get("auto_post", False))

        try:
            journal_entry = DoubleEntryAccountingService.create_journal_entry(
                restaurant=restaurant,
                entry_date=entry_date,
                source_document_type=source_document_type,
                lines=lines,
                user=request.user,
                notes=notes,
                auto_post=auto_post,
            )
            return Response(JournalEntrySerializer(journal_entry).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def post(self, request, pk=None):
        journal = self.get_object()
        try:
            DoubleEntryAccountingService.post_journal_entry(journal, request.user)
            return Response(JournalEntrySerializer(journal).data)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def void(self, request, pk=None):
        journal = self.get_object()
        reason = request.data.get("reason", "Voided by user")
        try:
            reversal = DoubleEntryAccountingService.void_journal_entry(journal, request.user, reason)
            return Response({
                "original_entry": JournalEntrySerializer(journal).data,
                "reversal_entry": JournalEntrySerializer(reversal).data,
            })
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)


class CashSessionViewSet(viewsets.ModelViewSet):
    serializer_class = CashSessionSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("finance.cash.manage")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return CashSession.objects.none()
        return CashSession.objects.filter(restaurant=restaurant).order_by("-opened_at")

    def create(self, request, *args, **kwargs):
        restaurant = _get_restaurant(request)
        register_name = request.data.get("register_name", "Front Counter POS #1")
        opening_balance = Decimal(str(request.data.get("opening_balance", "0.00")))
        session = CashManagementService.open_session(restaurant, register_name, opening_balance, request.user)
        return Response(CashSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def payout(self, request, pk=None):
        session = self.get_object()
        amount = Decimal(str(request.data.get("amount", "0.00")))
        reason = request.data.get("reason", "Petty Cash Payout")
        category = request.data.get("category", "Operational")
        tx = CashManagementService.record_cash_transaction(
            session=session,
            transaction_type=CashTransaction.TransactionType.PAYOUT,
            amount=amount,
            reason=reason,
            user=request.user,
            category=category,
        )
        return Response(CashTransactionSerializer(tx).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        session = self.get_object()
        counted_cash = Decimal(str(request.data.get("counted_cash", "0.00")))
        notes = request.data.get("notes", "")
        try:
            session = CashManagementService.close_session(session, counted_cash, request.user, notes)
            return Response(CashSessionSerializer(session).data)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="approve-variance")
    def approve_variance(self, request, pk=None):
        session = self.get_object()
        approval_notes = request.data.get("approval_notes", "Approved by manager")
        session = CashManagementService.approve_variance(session, request.user, approval_notes)
        return Response(CashSessionSerializer(session).data)


class BankAccountViewSet(viewsets.ModelViewSet):
    serializer_class = BankAccountSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return BankAccount.objects.none()
        return BankAccount.objects.filter(restaurant=restaurant)

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)


class BankTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = BankTransactionSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return BankTransaction.objects.none()
        return BankTransaction.objects.filter(restaurant=restaurant).order_by("-transaction_date")

    @action(detail=True, methods=["post"])
    def match(self, request, pk=None):
        tx = self.get_object()
        payment_id = request.data.get("payment_id")
        tx.matched_payment_id = payment_id
        tx.reconciliation_status = BankTransaction.ReconciliationStatus.MATCHED
        tx.save(update_fields=["matched_payment_id", "reconciliation_status", "updated_at"])
        return Response(BankTransactionSerializer(tx).data)

    @action(detail=True, methods=["post"])
    def reconcile(self, request, pk=None):
        tx = self.get_object()
        tx.reconciliation_status = BankTransaction.ReconciliationStatus.RECONCILED
        tx.reconciled_at = timezone.now()
        tx.save(update_fields=["reconciliation_status", "reconciled_at", "updated_at"])
        return Response(BankTransactionSerializer(tx).data)


class AccountsReceivableViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AccountsReceivableSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return AccountsReceivable.objects.none()
        return AccountsReceivable.objects.filter(restaurant=restaurant).order_by("due_date")


class AccountsPayableViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AccountsPayableSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return AccountsPayable.objects.none()
        return AccountsPayable.objects.filter(restaurant=restaurant).order_by("due_date")


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return Expense.objects.none()
        return Expense.objects.filter(restaurant=restaurant).order_by("-expense_date", "-created_at")

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        count = Expense.objects.filter(restaurant=restaurant).count() + 1
        expense_number = f"EXP-{count:05d}"
        serializer.save(
            restaurant=restaurant,
            expense_number=expense_number,
            created_by=self.request.user,
            status=Expense.ExpenseStatus.DRAFT,
        )

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        expense = self.get_object()
        expense.status = Expense.ExpenseStatus.SUBMITTED
        expense.save(update_fields=["status", "updated_at"])
        return Response(ExpenseSerializer(expense).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        expense = self.get_object()
        expense.status = Expense.ExpenseStatus.APPROVED
        expense.approved_by = request.user
        expense.approved_at = timezone.now()

        # Create balanced journal entry: Debit Expense, Credit Bank Checking
        bank_account = ChartOfAccountsService.get_system_account(expense.restaurant, "1010")
        lines = [
            {
                "account_id": expense.account.id,
                "debit": expense.amount,
                "credit": Decimal("0.00"),
                "description": f"Expense {expense.expense_number}: {expense.payee} ({expense.get_category_display()})",
                "cost_center": expense.cost_center,
            },
            {
                "account_id": bank_account.id,
                "debit": Decimal("0.00"),
                "credit": expense.amount,
                "description": f"Payment for Expense {expense.expense_number}",
                "cost_center": expense.cost_center,
            },
        ]
        je = DoubleEntryAccountingService.create_journal_entry(
            restaurant=expense.restaurant,
            entry_date=expense.expense_date,
            source_document_type=JournalEntry.SourceDocumentType.EXPENSE,
            source_id=str(expense.id),
            lines=lines,
            user=request.user,
            notes=f"Approved expense {expense.expense_number}",
            auto_post=True,
        )
        expense.journal_entry = je
        expense.save(update_fields=["status", "approved_by", "approved_at", "journal_entry", "updated_at"])
        return Response(ExpenseSerializer(expense).data)


class FinancialPeriodViewSet(viewsets.ModelViewSet):
    serializer_class = FinancialPeriodSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return FinancialPeriod.objects.none()
        return FinancialPeriod.objects.filter(restaurant=restaurant).order_by("-start_date")

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        period = self.get_object()
        notes = request.data.get("notes", "")
        period.status = FinancialPeriod.PeriodStatus.CLOSED
        period.closed_by = request.user
        period.closed_at = timezone.now()
        period.notes = notes
        period.save(update_fields=["status", "closed_by", "closed_at", "notes", "updated_at"])
        return Response(FinancialPeriodSerializer(period).data)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        period = self.get_object()
        period.status = FinancialPeriod.PeriodStatus.OPEN
        period.closed_by = None
        period.closed_at = None
        period.save(update_fields=["status", "closed_by", "closed_at", "updated_at"])
        return Response(FinancialPeriodSerializer(period).data)


# --------------------------------------------------------------------------
# Financial Statement Views (P&L, Balance Sheet, Cash Flow, Trial Balance, Ledger)
# --------------------------------------------------------------------------

class TrialBalanceView(APIView):
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get(self, request):
        restaurant = _get_restaurant(request)
        as_of_date = request.query_params.get("as_of_date")
        data = FinancialReportingService.generate_trial_balance(restaurant, as_of_date)
        return Response(data)


class ProfitLossView(APIView):
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get(self, request):
        restaurant = _get_restaurant(request)
        start_date = request.query_params.get("start_date") or timezone.now().replace(day=1).date()
        end_date = request.query_params.get("end_date") or timezone.now().date()
        data = FinancialReportingService.generate_profit_and_loss(restaurant, start_date, end_date)
        return Response(data)


class BalanceSheetView(APIView):
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get(self, request):
        restaurant = _get_restaurant(request)
        as_of_date = request.query_params.get("as_of_date")
        data = FinancialReportingService.generate_balance_sheet(restaurant, as_of_date)
        return Response(data)


class CashFlowView(APIView):
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get(self, request):
        restaurant = _get_restaurant(request)
        start_date = request.query_params.get("start_date") or timezone.now().replace(day=1).date()
        end_date = request.query_params.get("end_date") or timezone.now().date()
        data = FinancialReportingService.generate_cash_flow(restaurant, start_date, end_date)
        return Response(data)


class GeneralLedgerView(APIView):
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get(self, request):
        restaurant = _get_restaurant(request)
        account_id = request.query_params.get("account_id")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        qs = JournalLine.objects.filter(
            journal_entry__restaurant=restaurant,
            journal_entry__status=JournalEntry.EntryStatus.POSTED
        )
        if account_id:
            qs = qs.filter(account_id=account_id)
        if start_date:
            qs = qs.filter(journal_entry__entry_date__gte=start_date)
        if end_date:
            qs = qs.filter(journal_entry__entry_date__lte=end_date)

        lines = []
        running_balance = Decimal("0.00")
        for line in qs.order_by("journal_entry__entry_date", "created_at"):
            if line.account.normal_balance == "DEBIT":
                running_balance += (line.debit - line.credit)
            else:
                running_balance += (line.credit - line.debit)

            lines.append({
                "id": str(line.id),
                "date": str(line.journal_entry.entry_date),
                "entry_number": line.journal_entry.entry_number,
                "account_code": line.account.code,
                "account_name": line.account.name,
                "description": line.description or line.journal_entry.notes,
                "debit": str(line.debit),
                "credit": str(line.credit),
                "cost_center": line.cost_center,
                "running_balance": str(running_balance),
            })

        return Response({"lines": lines, "total_records": len(lines)})


class FinanceDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasActivePermission("finance.view")]

    def get(self, request):
        restaurant = _get_restaurant(request)
        now = timezone.now()
        start_of_month = now.replace(day=1).date()
        today = now.date()

        pnl = FinancialReportingService.generate_profit_and_loss(restaurant, start_of_month, today)
        tb = FinancialReportingService.generate_trial_balance(restaurant, today)

        # Cash on hand
        cash_lines = JournalLine.objects.filter(
            journal_entry__restaurant=restaurant,
            journal_entry__status=JournalEntry.EntryStatus.POSTED,
            account__code="1000",
        ).aggregate(dr=Sum("debit"), cr=Sum("credit"))
        cash_on_hand = (cash_lines["dr"] or Decimal("0.00")) - (cash_lines["cr"] or Decimal("0.00"))

        # Bank balance
        bank_lines = JournalLine.objects.filter(
            journal_entry__restaurant=restaurant,
            journal_entry__status=JournalEntry.EntryStatus.POSTED,
            account__code="1010",
        ).aggregate(dr=Sum("debit"), cr=Sum("credit"))
        bank_balance = (bank_lines["dr"] or Decimal("0.00")) - (bank_lines["cr"] or Decimal("0.00"))

        # Open cash sessions
        open_sessions_count = CashSession.objects.filter(
            restaurant=restaurant,
            status=CashSession.SessionStatus.OPEN,
        ).count()

        # Pending expenses
        pending_expenses_count = Expense.objects.filter(
            restaurant=restaurant,
            status=Expense.ExpenseStatus.SUBMITTED,
        ).count()

        return Response({
            "net_revenue": pnl["revenue"]["net_revenue"],
            "total_cogs": pnl["cogs"]["total_cogs"],
            "gross_profit": pnl["gross_profit"],
            "gross_margin_pct": pnl["gross_margin_pct"],
            "operating_expenses": pnl["operating_expenses"]["total_operating_expenses"],
            "net_profit": pnl["net_profit"],
            "net_margin_pct": pnl["net_margin_pct"],
            "cash_on_hand": str(cash_on_hand),
            "bank_balance": str(bank_balance),
            "is_trial_balance_healthy": tb["is_balanced"],
            "open_cash_sessions": open_sessions_count,
            "pending_expenses": pending_expenses_count,
        })
