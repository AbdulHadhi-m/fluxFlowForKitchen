import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.billing.models import Bill, Payment
from apps.customers.models import Customer
from apps.procurement.models import Supplier, PurchaseOrder, SupplierInvoice


class AccountCategory(models.TextChoices):
    ASSET = "ASSET", "Asset"
    LIABILITY = "LIABILITY", "Liability"
    EQUITY = "EQUITY", "Equity"
    REVENUE = "REVENUE", "Revenue"
    EXPENSE = "EXPENSE", "Expense"


class NormalBalance(models.TextChoices):
    DEBIT = "DEBIT", "Debit"
    CREDIT = "CREDIT", "Credit"


class CostCenter(models.TextChoices):
    KITCHEN = "KITCHEN", "Kitchen Operations"
    FOH = "FOH", "Front of House / Dining"
    BAR = "BAR", "Bar & Beverage"
    DELIVERY = "DELIVERY", "Delivery & Dispatch"
    ADMIN = "ADMIN", "Administration & General"
    MARKETING = "MARKETING", "Marketing & Growth"


class Account(UUIDModel, TimeStampedModel, StatusModel):
    """
    Hierarchical Chart of Accounts for double-entry bookkeeping.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="accounts",
        help_text="Tenant owning this account"
    )
    code = models.CharField(
        max_length=32,
        db_index=True,
        help_text="Account Code (e.g. 1000, 1010, 2000, 4000, 5000)"
    )
    name = models.CharField(max_length=128, help_text="Human-readable account title")
    category = models.CharField(
        max_length=20,
        choices=AccountCategory.choices,
        db_index=True,
        help_text="Account Classification"
    )
    normal_balance = models.CharField(
        max_length=10,
        choices=NormalBalance.choices,
        default=NormalBalance.DEBIT,
        help_text="Normal accounting balance (Debit for Assets/Expenses, Credit for Liabilities/Equity/Revenue)"
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        help_text="Parent account for hierarchical structure"
    )
    description = models.TextField(blank=True, default="", help_text="Purpose and scope of account")
    is_system_account = models.BooleanField(
        default=False,
        help_text="Protected system account required for automatic postings"
    )

    class Meta:
        verbose_name = "Account"
        verbose_name_plural = "Chart of Accounts"
        ordering = ["code"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "code"], name="unique_account_code_per_restaurant"),
        ]

    def __str__(self):
        return f"{self.code} - {self.name} ({self.category})"


class FinancialPeriod(UUIDModel, TimeStampedModel):
    """
    Accounting period (Month, Quarter, Year) with period locking controls.
    """
    class PeriodStatus(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed / Locked"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="financial_periods"
    )
    name = models.CharField(max_length=64, help_text="e.g. FY2026-M08, August 2026")
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=PeriodStatus.choices,
        default=PeriodStatus.OPEN,
        db_index=True
    )
    closed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="closed_periods"
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Financial Period"
        verbose_name_plural = "Financial Periods"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.name} [{self.status}] ({self.start_date} to {self.end_date})"


class JournalEntry(UUIDModel, TimeStampedModel):
    """
    Double-entry General Journal Entry header.
    Immutable once posted.
    """
    class EntryStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        POSTED = "POSTED", "Posted"
        VOIDED = "VOIDED", "Voided / Reversed"

    class SourceDocumentType(models.TextChoices):
        MANUAL = "MANUAL", "Manual Journal Entry"
        SALE = "SALE", "Customer Sale / Bill Settlement"
        REFUND = "REFUND", "Customer Refund"
        PURCHASE_RECEIPT = "PURCHASE_RECEIPT", "Inventory Goods Intake"
        SUPPLIER_INVOICE = "SUPPLIER_INVOICE", "Supplier Invoice AP"
        SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT", "Supplier Payment Outflow"
        CASH_PAYOUT = "CASH_PAYOUT", "Cash Drawer Payout"
        EXPENSE = "EXPENSE", "Operational Expense"
        ADJUSTMENT = "ADJUSTMENT", "Inventory / Audit Adjustment"
        PERIOD_CLOSE = "PERIOD_CLOSE", "Period Year-End Close"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="journal_entries"
    )
    entry_number = models.CharField(
        max_length=32,
        db_index=True,
        help_text="e.g. JE-000001"
    )
    entry_date = models.DateField(db_index=True)
    period = models.ForeignKey(
        FinancialPeriod,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="journal_entries"
    )
    status = models.CharField(
        max_length=20,
        choices=EntryStatus.choices,
        default=EntryStatus.DRAFT,
        db_index=True
    )
    source_document_type = models.CharField(
        max_length=32,
        choices=SourceDocumentType.choices,
        default=SourceDocumentType.MANUAL
    )
    source_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True,
        help_text="UUID or ID of source transaction (Bill, PO, Expense, CashSession)"
    )
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_journals"
    )
    posted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posted_journals"
    )
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Journal Entry"
        verbose_name_plural = "Journal Entries"
        ordering = ["-entry_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "entry_number"], name="unique_journal_entry_per_restaurant"),
        ]

    def __str__(self):
        return f"{self.entry_number} ({self.status}) - {self.entry_date}"

    @property
    def total_debit(self) -> Decimal:
        return sum((line.debit for line in self.lines.all()), Decimal("0.00"))

    @property
    def total_credit(self) -> Decimal:
        return sum((line.credit for line in self.lines.all()), Decimal("0.00"))

    @property
    def is_balanced(self) -> bool:
        return abs(self.total_debit - self.total_credit) < Decimal("0.0001") and self.total_debit > Decimal("0.00")


class JournalLine(UUIDModel, TimeStampedModel):
    """
    Individual debit or credit leg of a double-entry Journal Entry.
    """
    journal_entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="lines"
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="journal_lines"
    )
    debit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    credit = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    description = models.CharField(max_length=255, blank=True, default="")
    reference = models.CharField(max_length=64, blank=True, default="")
    cost_center = models.CharField(
        max_length=20,
        choices=CostCenter.choices,
        default=CostCenter.ADMIN,
        blank=True
    )

    class Meta:
        verbose_name = "Journal Line"
        verbose_name_plural = "Journal Lines"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.account.code} Dr:{self.debit} Cr:{self.credit}"


class CashSession(UUIDModel, TimeStampedModel):
    """
    Cash Drawer register session with opening float, sales intake, payouts, and end-of-shift reconciliation.
    """
    class SessionStatus(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"
        RECONCILIATION_REQUIRED = "RECONCILIATION_REQUIRED", "Variance Pending Review"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="cash_sessions"
    )
    register_name = models.CharField(max_length=64, default="Front Counter POS #1")
    opened_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="opened_cash_sessions"
    )
    closed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="closed_cash_sessions"
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_cash_sessions"
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    opening_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))]
    )
    cash_sales = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    cash_payouts = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    cash_refunds = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    counted_cash = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    variance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(
        max_length=30,
        choices=SessionStatus.choices,
        default=SessionStatus.OPEN,
        db_index=True
    )
    notes = models.TextField(blank=True, default="")
    approval_notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Cash Session"
        verbose_name_plural = "Cash Sessions"
        ordering = ["-opened_at"]

    def __str__(self):
        return f"{self.register_name} [{self.status}] Opened: {self.opened_at.strftime('%Y-%m-%d %H:%M')}"


class CashTransaction(UUIDModel, TimeStampedModel):
    """
    Individual cash movements within an active drawer session (e.g. Petty Cash payout, Cash drop).
    """
    class TransactionType(models.TextChoices):
        SALE = "SALE", "Cash Sale Receipt"
        PAYOUT = "PAYOUT", "Petty Cash Payout"
        REFUND = "REFUND", "Cash Refund"
        DROP = "DROP", "Safe Cash Drop"
        ADD = "ADD", "Float Cash Addition"

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="cash_transactions")
    session = models.ForeignKey(CashSession, on_delete=models.CASCADE, related_name="transactions")
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    reason = models.CharField(max_length=255)
    category = models.CharField(max_length=64, blank=True, default="Operational")
    reference = models.CharField(max_length=64, blank=True, default="")
    performed_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="cash_transactions")

    class Meta:
        verbose_name = "Cash Transaction"
        verbose_name_plural = "Cash Transactions"
        ordering = ["-created_at"]


class BankAccount(UUIDModel, TimeStampedModel, StatusModel):
    """
    Secure Bank Account definition without exposing sensitive credentials.
    """
    class BankAccountType(models.TextChoices):
        CHECKING = "CHECKING", "Operating Checking Account"
        SAVINGS = "SAVINGS", "Reserve Savings Account"
        MERCHANT_CLEARING = "MERCHANT_CLEARING", "Merchant Card Clearing Account"

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="bank_accounts")
    bank_name = models.CharField(max_length=128, help_text="e.g. Chase Bank, Barclays, HDFC")
    account_name = models.CharField(max_length=128, help_text="e.g. Main Operating Account")
    masked_account_number = models.CharField(max_length=32, help_text="e.g. **** 5678")
    currency = models.CharField(max_length=3, default="USD")
    account_type = models.CharField(max_length=30, choices=BankAccountType.choices, default=BankAccountType.CHECKING)
    gl_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="linked_bank_accounts")

    class Meta:
        verbose_name = "Bank Account"
        verbose_name_plural = "Bank Accounts"
        ordering = ["bank_name", "account_name"]

    def __str__(self):
        return f"{self.bank_name} ({self.masked_account_number})"


class BankTransaction(UUIDModel, TimeStampedModel):
    """
    Imported or manual bank statement transaction line.
    """
    class BankTxType(models.TextChoices):
        DEPOSIT = "DEPOSIT", "Deposit / Customer Credit"
        WITHDRAWAL = "WITHDRAWAL", "Withdrawal / Supplier Debit"
        FEE = "FEE", "Bank Fee / Merchant Fee"
        TRANSFER = "TRANSFER", "Account Transfer"
        SETTLEMENT = "SETTLEMENT", "Card Settlement Batch"

    class ReconciliationStatus(models.TextChoices):
        UNMATCHED = "UNMATCHED", "Unmatched"
        MATCHED = "MATCHED", "Matched"
        RECONCILED = "RECONCILED", "Reconciled"
        EXCLUDED = "EXCLUDED", "Excluded"

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="bank_transactions")
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name="transactions")
    transaction_date = models.DateField(db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=BankTxType.choices)
    reference = models.CharField(max_length=128, blank=True, default="")
    description = models.CharField(max_length=255)
    reconciliation_status = models.CharField(
        max_length=20,
        choices=ReconciliationStatus.choices,
        default=ReconciliationStatus.UNMATCHED,
        db_index=True
    )
    matched_payment_id = models.CharField(max_length=64, blank=True, default="")
    reconciled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Bank Transaction"
        verbose_name_plural = "Bank Transactions"
        ordering = ["-transaction_date"]


class AccountsReceivable(UUIDModel, TimeStampedModel):
    """
    Customer Credit Receivables tracking.
    """
    class ARStatus(models.TextChoices):
        OPEN = "OPEN", "Open"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        VOID = "VOID", "Voided"

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="receivables")
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="receivables")
    bill = models.ForeignKey(Bill, on_delete=models.PROTECT, related_name="receivables")
    invoice_number = models.CharField(max_length=32, db_index=True)
    invoice_date = models.DateField(db_index=True)
    due_date = models.DateField(db_index=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    balance_due = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=ARStatus.choices, default=ARStatus.OPEN, db_index=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Accounts Receivable"
        verbose_name_plural = "Accounts Receivable"
        ordering = ["due_date"]


class AccountsPayable(UUIDModel, TimeStampedModel):
    """
    Supplier Payables ledger integrating with Prompt 28 Procurement.
    """
    class APStatus(models.TextChoices):
        OPEN = "OPEN", "Open"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        DISPUTED = "DISPUTED", "Disputed"
        VOID = "VOID", "Void"

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="payables")
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="payables")
    supplier_invoice = models.ForeignKey(
        SupplierInvoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payables"
    )
    po_number = models.CharField(max_length=32, blank=True, default="")
    invoice_number = models.CharField(max_length=64, db_index=True)
    invoice_date = models.DateField(db_index=True)
    due_date = models.DateField(db_index=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    balance_due = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=APStatus.choices, default=APStatus.OPEN, db_index=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Accounts Payable"
        verbose_name_plural = "Accounts Payable"
        ordering = ["due_date"]


class Expense(UUIDModel, TimeStampedModel):
    """
    Operational Restaurant Expenses (Rent, Utilities, Marketing, Maintenance).
    """
    class ExpenseStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted for Approval"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"

    class ExpenseCategory(models.TextChoices):
        UTILITIES = "UTILITIES", "Utilities (Electricity, Water, Gas)"
        RENT = "RENT", "Rent & Property Lease"
        MAINTENANCE = "MAINTENANCE", "Kitchen Equipment & Maintenance"
        MARKETING = "MARKETING", "Marketing, Ads & PR"
        TRANSPORT = "TRANSPORT", "Logistics & Transport"
        SUPPLIES = "SUPPLIES", "Cleaning & Non-Food Supplies"
        PROFESSIONAL_SERVICES = "PROFESSIONAL_SERVICES", "Legal & Accounting Fees"
        PAYROLL_FEES = "PAYROLL_FEES", "Payroll & Staff Welfare"
        OTHER = "OTHER", "Other Operational Expenses"

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="expenses")
    expense_number = models.CharField(max_length=32, db_index=True)
    category = models.CharField(max_length=32, choices=ExpenseCategory.choices, db_index=True)
    cost_center = models.CharField(max_length=20, choices=CostCenter.choices, default=CostCenter.ADMIN)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    expense_date = models.DateField(db_index=True)
    payment_method = models.CharField(max_length=30, default="BANK_TRANSFER")
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="expenses")
    payee = models.CharField(max_length=128, help_text="Vendor / Payee Name")
    reference = models.CharField(max_length=128, blank=True, default="")
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=ExpenseStatus.choices, default=ExpenseStatus.DRAFT, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="created_expenses")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_expenses")
    approved_at = models.DateTimeField(null=True, blank=True)
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")

    class Meta:
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"
        ordering = ["-expense_date", "-created_at"]
