from rest_framework import serializers
from .models import (
    Account,
    AccountCategory,
    NormalBalance,
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


class AccountSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    normal_balance_display = serializers.CharField(source="get_normal_balance_display", read_only=True)

    class Meta:
        model = Account
        fields = [
            "id",
            "code",
            "name",
            "category",
            "category_display",
            "normal_balance",
            "normal_balance_display",
            "parent",
            "description",
            "is_system_account",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system_account", "created_at", "updated_at"]


class JournalLineSerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source="account.code", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)

    class Meta:
        model = JournalLine
        fields = [
            "id",
            "account",
            "account_code",
            "account_name",
            "debit",
            "credit",
            "description",
            "reference",
            "cost_center",
        ]


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    posted_by_name = serializers.CharField(source="posted_by.get_full_name", read_only=True)
    total_debit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_credit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    is_balanced = serializers.BooleanField(read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "entry_number",
            "entry_date",
            "period",
            "status",
            "source_document_type",
            "source_id",
            "notes",
            "created_by",
            "created_by_name",
            "posted_by",
            "posted_by_name",
            "posted_at",
            "total_debit",
            "total_credit",
            "is_balanced",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "entry_number",
            "status",
            "created_by",
            "posted_by",
            "posted_at",
            "created_at",
            "updated_at",
        ]


class CashTransactionSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)

    class Meta:
        model = CashTransaction
        fields = [
            "id",
            "session",
            "transaction_type",
            "amount",
            "reason",
            "category",
            "reference",
            "performed_by",
            "performed_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "performed_by", "created_at"]


class CashSessionSerializer(serializers.ModelSerializer):
    opened_by_name = serializers.CharField(source="opened_by.get_full_name", read_only=True)
    closed_by_name = serializers.CharField(source="closed_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)
    transactions = CashTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = CashSession
        fields = [
            "id",
            "register_name",
            "opened_by",
            "opened_by_name",
            "closed_by",
            "closed_by_name",
            "approved_by",
            "approved_by_name",
            "opened_at",
            "closed_at",
            "opening_balance",
            "cash_sales",
            "cash_payouts",
            "cash_refunds",
            "expected_cash",
            "counted_cash",
            "variance",
            "status",
            "notes",
            "approval_notes",
            "transactions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "opened_by",
            "closed_by",
            "approved_by",
            "opened_at",
            "closed_at",
            "cash_sales",
            "cash_payouts",
            "cash_refunds",
            "expected_cash",
            "variance",
            "status",
            "created_at",
            "updated_at",
        ]


class BankAccountSerializer(serializers.ModelSerializer):
    gl_account_code = serializers.CharField(source="gl_account.code", read_only=True)

    class Meta:
        model = BankAccount
        fields = [
            "id",
            "bank_name",
            "account_name",
            "masked_account_number",
            "currency",
            "account_type",
            "gl_account",
            "gl_account_code",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class BankTransactionSerializer(serializers.ModelSerializer):
    bank_account_name = serializers.CharField(source="bank_account.account_name", read_only=True)

    class Meta:
        model = BankTransaction
        fields = [
            "id",
            "bank_account",
            "bank_account_name",
            "transaction_date",
            "amount",
            "transaction_type",
            "reference",
            "description",
            "reconciliation_status",
            "matched_payment_id",
            "reconciled_at",
            "created_at",
        ]
        read_only_fields = ["id", "reconciled_at", "created_at"]


class AccountsReceivableSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model = AccountsReceivable
        fields = [
            "id",
            "customer",
            "customer_name",
            "bill",
            "invoice_number",
            "invoice_date",
            "due_date",
            "total_amount",
            "paid_amount",
            "balance_due",
            "status",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AccountsPayableSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = AccountsPayable
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "supplier_invoice",
            "po_number",
            "invoice_number",
            "invoice_date",
            "due_date",
            "total_amount",
            "paid_amount",
            "balance_due",
            "status",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ExpenseSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "expense_number",
            "category",
            "cost_center",
            "amount",
            "tax_amount",
            "expense_date",
            "payment_method",
            "account",
            "account_name",
            "payee",
            "reference",
            "description",
            "status",
            "created_by",
            "created_by_name",
            "approved_by",
            "approved_by_name",
            "approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "expense_number",
            "status",
            "created_by",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]


class FinancialPeriodSerializer(serializers.ModelSerializer):
    closed_by_name = serializers.CharField(source="closed_by.get_full_name", read_only=True)

    class Meta:
        model = FinancialPeriod
        fields = [
            "id",
            "name",
            "start_date",
            "end_date",
            "status",
            "closed_by",
            "closed_by_name",
            "closed_at",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "closed_by", "closed_at", "created_at"]
