import uuid
from decimal import Decimal
from typing import List, Dict, Any, Optional
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Sum, Q

from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.billing.models import Bill, Payment
from apps.procurement.models import SupplierInvoice
from apps.audit.services import AuditService
from apps.notifications.services import NotificationService
from apps.notifications.models import NotificationType, NotificationSeverity
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
    CostCenter,
)


class ChartOfAccountsService:
    """
    Standard Chart of Accounts initialization and balance calculations.
    """

    DEFAULT_ACCOUNTS = [
        # Assets (1000 - 1999)
        ("1000", "Cash on Hand / Drawers", AccountCategory.ASSET, NormalBalance.DEBIT, True),
        ("1010", "Main Bank Checking Account", AccountCategory.ASSET, NormalBalance.DEBIT, True),
        ("1020", "Credit Card Clearing Account", AccountCategory.ASSET, NormalBalance.DEBIT, True),
        ("1030", "UPI / QR Clearing Account", AccountCategory.ASSET, NormalBalance.DEBIT, True),
        ("1100", "Accounts Receivable - Customer Credit", AccountCategory.ASSET, NormalBalance.DEBIT, True),
        ("1200", "Food & Beverage Inventory Asset", AccountCategory.ASSET, NormalBalance.DEBIT, True),
        ("1500", "Kitchen Equipment & Assets", AccountCategory.ASSET, NormalBalance.DEBIT, False),

        # Liabilities (2000 - 2999)
        ("2000", "Accounts Payable - Suppliers", AccountCategory.LIABILITY, NormalBalance.CREDIT, True),
        ("2100", "Sales Tax & VAT Payable", AccountCategory.LIABILITY, NormalBalance.CREDIT, True),
        ("2200", "Gratuity & Tips Payable", AccountCategory.LIABILITY, NormalBalance.CREDIT, True),
        ("2500", "Accrued Operating Expenses", AccountCategory.LIABILITY, NormalBalance.CREDIT, False),

        # Equity (3000 - 3999)
        ("3000", "Owner Capital / Equity", AccountCategory.EQUITY, NormalBalance.CREDIT, True),
        ("3100", "Retained Earnings", AccountCategory.EQUITY, NormalBalance.CREDIT, True),

        # Revenue (4000 - 4999)
        ("4000", "Food & Beverage Sales Revenue", AccountCategory.REVENUE, NormalBalance.CREDIT, True),
        ("4050", "Delivery & Service Fee Revenue", AccountCategory.REVENUE, NormalBalance.CREDIT, True),
        ("4100", "Promotional Discounts & Coupons", AccountCategory.REVENUE, NormalBalance.DEBIT, True),  # Contra-revenue

        # Cost of Goods Sold (5000 - 5999)
        ("5000", "Cost of Goods Sold - Food Raw Materials", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),
        ("5050", "Cost of Goods Sold - Beverages & Bar", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),
        ("5100", "Kitchen Food Spoilage & Wastage Cost", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),

        # Operating Expenses (6000 - 6999)
        ("6000", "Kitchen & Floor Staff Wages", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),
        ("6100", "Restaurant Rent & Lease", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),
        ("6200", "Utilities (Electricity, Gas, Water)", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),
        ("6300", "Equipment Maintenance & Repairs", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),
        ("6400", "Marketing, Ads & Promotional Campaigns", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),
        ("6500", "Cleaning, Packaging & Kitchen Disposables", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),
        ("6600", "Merchant Payment Processing Fees", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),
        ("6700", "Cash Drawer Over / Short Variance", AccountCategory.EXPENSE, NormalBalance.DEBIT, True),
    ]

    @classmethod
    @transaction.atomic
    def seed_default_chart_of_accounts(cls, restaurant: Restaurant) -> List[Account]:
        created_accounts = []
        for code, name, category, normal_balance, is_sys in cls.DEFAULT_ACCOUNTS:
            account, _ = Account.objects.get_or_create(
                restaurant=restaurant,
                code=code,
                defaults={
                    "name": name,
                    "category": category,
                    "normal_balance": normal_balance,
                    "is_system_account": is_sys,
                    "is_active": True,
                }
            )
            created_accounts.append(account)
        return created_accounts

    @classmethod
    def get_system_account(cls, restaurant: Restaurant, code: str) -> Account:
        try:
            return Account.objects.get(restaurant=restaurant, code=code)
        except Account.DoesNotExist:
            cls.seed_default_chart_of_accounts(restaurant)
            return Account.objects.get(restaurant=restaurant, code=code)


class DoubleEntryAccountingService:
    """
    Core double-entry journal engine with mathematical integrity checks.
    """

    @classmethod
    def validate_journal_lines(cls, lines: List[Dict[str, Any]], restaurant: Restaurant):
        if not lines or len(lines) < 2:
            raise ValidationError("A journal entry requires at least two lines.")

        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")

        for idx, line in enumerate(lines, 1):
            debit = Decimal(str(line.get("debit", "0.00")))
            credit = Decimal(str(line.get("credit", "0.00")))

            if debit < Decimal("0.00") or credit < Decimal("0.00"):
                raise ValidationError(f"Line {idx}: Debit and Credit amounts must be non-negative.")
            if debit > Decimal("0.00") and credit > Decimal("0.00"):
                raise ValidationError(f"Line {idx}: A single line cannot have both positive Debit and Credit.")
            if debit == Decimal("0.00") and credit == Decimal("0.00"):
                raise ValidationError(f"Line {idx}: Line must have either Debit or Credit greater than zero.")

            total_debit += debit
            total_credit += credit

            account_id = line.get("account_id") or line.get("account")
            if isinstance(account_id, Account):
                account = account_id
            else:
                account = Account.objects.filter(restaurant=restaurant, id=account_id).first()
                if not account:
                    raise ValidationError(f"Line {idx}: Account not found or unauthorized.")
            if not account.is_active:
                raise ValidationError(f"Line {idx}: Account {account.code} is inactive.")

        if abs(total_debit - total_credit) > Decimal("0.0001"):
            raise ValidationError(
                f"Unbalanced journal entry! Total Debits ({total_debit}) must equal Total Credits ({total_credit})."
            )

    @classmethod
    @transaction.atomic
    def create_journal_entry(
        cls,
        restaurant: Restaurant,
        entry_date: Any,
        source_document_type: str,
        lines: List[Dict[str, Any]],
        user: User,
        source_id: str = "",
        notes: str = "",
        auto_post: bool = False,
    ) -> JournalEntry:
        cls.validate_journal_lines(lines, restaurant)

        # Ensure active period or get open period
        period = FinancialPeriod.objects.filter(
            restaurant=restaurant,
            start_date__lte=entry_date,
            end_date__gte=entry_date,
        ).first()

        if period and period.status == FinancialPeriod.PeriodStatus.CLOSED:
            raise ValidationError(f"Cannot post transactions into closed financial period '{period.name}'.")

        # Generate sequential entry number
        count = JournalEntry.objects.filter(restaurant=restaurant).count() + 1
        entry_number = f"JE-{count:06d}"

        journal_entry = JournalEntry.objects.create(
            restaurant=restaurant,
            entry_number=entry_number,
            entry_date=entry_date,
            period=period,
            status=JournalEntry.EntryStatus.DRAFT,
            source_document_type=source_document_type,
            source_id=source_id,
            notes=notes,
            created_by=user,
        )

        for line in lines:
            account_id = line.get("account_id") or line.get("account")
            if isinstance(account_id, Account):
                acc = account_id
            else:
                acc = Account.objects.get(restaurant=restaurant, id=account_id)

            JournalLine.objects.create(
                journal_entry=journal_entry,
                account=acc,
                debit=Decimal(str(line.get("debit", "0.00"))),
                credit=Decimal(str(line.get("credit", "0.00"))),
                description=line.get("description", ""),
                reference=line.get("reference", ""),
                cost_center=line.get("cost_center", CostCenter.ADMIN),
            )

        if auto_post:
            cls.post_journal_entry(journal_entry, user)

        return journal_entry

    @classmethod
    @transaction.atomic
    def post_journal_entry(cls, journal_entry: JournalEntry, user: User) -> JournalEntry:
        if journal_entry.status == JournalEntry.EntryStatus.POSTED:
            return journal_entry

        if journal_entry.status == JournalEntry.EntryStatus.VOIDED:
            raise ValidationError("Cannot post a voided journal entry.")

        if not journal_entry.is_balanced:
            raise ValidationError("Cannot post unbalanced journal entry.")

        journal_entry.status = JournalEntry.EntryStatus.POSTED
        journal_entry.posted_by = user
        journal_entry.posted_at = timezone.now()
        journal_entry.save(update_fields=["status", "posted_by", "posted_at", "updated_at"])

        AuditService.log(
            restaurant=journal_entry.restaurant,
            actor=user,
            action="POST",
            entity_type="JOURNAL_ENTRY",
            entity_id=str(journal_entry.id),
            metadata={"entry_number": journal_entry.entry_number, "total_amount": str(journal_entry.total_debit)},
        )
        return journal_entry

    @classmethod
    @transaction.atomic
    def void_journal_entry(cls, journal_entry: JournalEntry, user: User, reason: str = "") -> JournalEntry:
        if journal_entry.status != JournalEntry.EntryStatus.POSTED:
            raise ValidationError("Only POSTED journal entries can be voided/reversed.")

        # Mark original as voided
        journal_entry.status = JournalEntry.EntryStatus.VOIDED
        journal_entry.save(update_fields=["status", "updated_at"])

        # Create reversing journal entry in current open period
        reversing_lines = []
        for line in journal_entry.lines.all():
            reversing_lines.append({
                "account_id": line.account.id,
                "debit": line.credit,  # Swap debit and credit
                "credit": line.debit,
                "description": f"Reversal of {journal_entry.entry_number}: {line.description}",
                "reference": journal_entry.entry_number,
                "cost_center": line.cost_center,
            })

        reversal = cls.create_journal_entry(
            restaurant=journal_entry.restaurant,
            entry_date=timezone.now().date(),
            source_document_type=JournalEntry.SourceDocumentType.ADJUSTMENT,
            source_id=str(journal_entry.id),
            lines=reversing_lines,
            user=user,
            notes=f"Reversal of {journal_entry.entry_number}. Reason: {reason}",
            auto_post=True,
        )

        AuditService.log(
            restaurant=journal_entry.restaurant,
            actor=user,
            action="VOID",
            entity_type="JOURNAL_ENTRY",
            entity_id=str(journal_entry.id),
            metadata={"reversed_by_entry": reversal.entry_number, "reason": reason},
        )
        return reversal


class SalesAccountingService:
    """
    Automatic posting of revenue, discounts, sales taxes, and payment tenders upon Bill settlement.
    """

    @classmethod
    @transaction.atomic
    def record_bill_payment_accounting(cls, payment: Payment, user: User) -> Optional[JournalEntry]:
        restaurant = payment.restaurant
        bill = payment.bill

        source_id = f"PAYMENT_{payment.id}"
        # Idempotency guard
        existing = JournalEntry.objects.filter(
            restaurant=restaurant,
            source_id=source_id,
            status=JournalEntry.EntryStatus.POSTED
        ).first()
        if existing:
            return existing

        lines = []
        payment_amount = payment.amount

        # 1. Determine Tender Account
        if payment.payment_method == Payment.PaymentMethod.CASH:
            tender_account = ChartOfAccountsService.get_system_account(restaurant, "1000")  # Cash
        elif payment.payment_method == Payment.PaymentMethod.CARD:
            tender_account = ChartOfAccountsService.get_system_account(restaurant, "1020")  # Card Clearing
        elif payment.payment_method == Payment.PaymentMethod.UPI:
            tender_account = ChartOfAccountsService.get_system_account(restaurant, "1030")  # UPI Clearing
        elif payment.payment_method == Payment.PaymentMethod.BANK_TRANSFER:
            tender_account = ChartOfAccountsService.get_system_account(restaurant, "1010")  # Bank
        else:
            tender_account = ChartOfAccountsService.get_system_account(restaurant, "1000")

        # Debit Tender
        lines.append({
            "account_id": tender_account.id,
            "debit": payment_amount,
            "credit": Decimal("0.00"),
            "description": f"Payment receipt for {bill.bill_number} via {payment.payment_method}",
            "cost_center": CostCenter.FOH,
        })

        # Calculate proportional revenue and tax allocation for this payment
        # (Handles partial payments seamlessly)
        grand_total = bill.grand_total if bill.grand_total > Decimal("0.00") else payment_amount
        ratio = payment_amount / grand_total if grand_total > Decimal("0.00") else Decimal("1.00")

        net_sales_portion = (bill.subtotal * ratio).quantize(Decimal("0.01"))
        tax_portion = (bill.tax_amount * ratio).quantize(Decimal("0.01"))
        service_portion = (bill.service_charge_amount * ratio).quantize(Decimal("0.01"))
        discount_portion = (bill.discount_amount * ratio).quantize(Decimal("0.01"))

        # Credit Sales Revenue
        sales_account = ChartOfAccountsService.get_system_account(restaurant, "4000")
        lines.append({
            "account_id": sales_account.id,
            "debit": Decimal("0.00"),
            "credit": net_sales_portion,
            "description": f"F&B Sales Revenue - {bill.bill_number}",
            "cost_center": CostCenter.FOH,
        })

        # Credit Tax Payable if any
        if tax_portion > Decimal("0.00"):
            tax_account = ChartOfAccountsService.get_system_account(restaurant, "2100")
            lines.append({
                "account_id": tax_account.id,
                "debit": Decimal("0.00"),
                "credit": tax_portion,
                "description": f"Sales Tax & VAT - {bill.bill_number}",
                "cost_center": CostCenter.FOH,
            })

        # Credit Service Charge if any
        if service_portion > Decimal("0.00"):
            service_account = ChartOfAccountsService.get_system_account(restaurant, "4050")
            lines.append({
                "account_id": service_account.id,
                "debit": Decimal("0.00"),
                "credit": service_portion,
                "description": f"Service Charge / Delivery - {bill.bill_number}",
                "cost_center": CostCenter.FOH,
            })

        # Debit Discounts if any (Contra Revenue)
        if discount_portion > Decimal("0.00"):
            discount_account = ChartOfAccountsService.get_system_account(restaurant, "4100")
            lines.append({
                "account_id": discount_account.id,
                "debit": discount_portion,
                "credit": Decimal("0.00"),
                "description": f"Discounts & Promotions - {bill.bill_number}",
                "cost_center": CostCenter.FOH,
            })

        # Balance check rounding adjust
        total_dr = sum(Decimal(str(l["debit"])) for l in lines)
        total_cr = sum(Decimal(str(l["credit"])) for l in lines)
        diff = total_dr - total_cr
        if diff != Decimal("0.00"):
            # Adjust to sales revenue line
            for l in lines:
                if l["account_id"] == sales_account.id:
                    l["credit"] = Decimal(str(l["credit"])) + diff
                    break

        return DoubleEntryAccountingService.create_journal_entry(
            restaurant=restaurant,
            entry_date=payment.created_at.date() if payment.created_at else timezone.now().date(),
            source_document_type=JournalEntry.SourceDocumentType.SALE,
            source_id=source_id,
            lines=lines,
            user=user,
            notes=f"Automated sales settlement entry for {bill.bill_number}",
            auto_post=True,
        )


class CashManagementService:
    """
    Cash Register drawer sessions, float balance, payouts, and shift reconciliation.
    """

    @classmethod
    @transaction.atomic
    def open_session(
        cls,
        restaurant: Restaurant,
        register_name: str,
        opening_balance: Decimal,
        user: User,
    ) -> CashSession:
        # Check if there is an active session for this user/register
        active = CashSession.objects.filter(
            restaurant=restaurant,
            register_name=register_name,
            status=CashSession.SessionStatus.OPEN
        ).first()
        if active:
            return active

        session = CashSession.objects.create(
            restaurant=restaurant,
            register_name=register_name,
            opening_balance=opening_balance,
            expected_cash=opening_balance,
            opened_by=user,
            status=CashSession.SessionStatus.OPEN,
        )

        AuditService.log(
            restaurant=restaurant,
            actor=user,
            action="CREATE",
            entity_type="CASH_SESSION",
            entity_id=str(session.id),
            metadata={"opening_balance": str(opening_balance), "register_name": register_name},
        )
        return session

    @classmethod
    @transaction.atomic
    def record_cash_transaction(
        cls,
        session: CashSession,
        transaction_type: str,
        amount: Decimal,
        reason: str,
        user: User,
        category: str = "Operational",
        reference: str = "",
    ) -> CashTransaction:
        if session.status != CashSession.SessionStatus.OPEN:
            raise ValidationError("Cannot record cash movements on a closed session.")

        tx = CashTransaction.objects.create(
            restaurant=session.restaurant,
            session=session,
            transaction_type=transaction_type,
            amount=amount,
            reason=reason,
            category=category,
            reference=reference,
            performed_by=user,
        )

        # Update session running tallies
        if transaction_type == CashTransaction.TransactionType.SALE:
            session.cash_sales += amount
            session.expected_cash += amount
        elif transaction_type == CashTransaction.TransactionType.PAYOUT:
            session.cash_payouts += amount
            session.expected_cash -= amount
        elif transaction_type == CashTransaction.TransactionType.REFUND:
            session.cash_refunds += amount
            session.expected_cash -= amount
        elif transaction_type == CashTransaction.TransactionType.DROP:
            session.expected_cash -= amount
        elif transaction_type == CashTransaction.TransactionType.ADD:
            session.expected_cash += amount

        session.save(update_fields=["cash_sales", "cash_payouts", "cash_refunds", "expected_cash", "updated_at"])
        return tx

    @classmethod
    @transaction.atomic
    def close_session(
        cls,
        session: CashSession,
        counted_cash: Decimal,
        user: User,
        notes: str = "",
    ) -> CashSession:
        if session.status != CashSession.SessionStatus.OPEN:
            raise ValidationError("Session is already closed.")

        variance = counted_cash - session.expected_cash
        session.counted_cash = counted_cash
        session.variance = variance
        session.closed_by = user
        session.closed_at = timezone.now()
        session.notes = notes

        # If variance is greater than $10, flag for review
        if abs(variance) > Decimal("10.00"):
            session.status = CashSession.SessionStatus.RECONCILIATION_REQUIRED
            # Notify management
            NotificationService.notify_roles(
                restaurant=session.restaurant,
                roles=["RESTAURANT_ADMIN", "MANAGER"],
                title="Cash Drawer Variance Detected",
                message=f"Register '{session.register_name}' closed with variance of ${variance:.2f} (Counted: ${counted_cash:.2f}, Expected: ${session.expected_cash:.2f}).",
                notification_type=NotificationType.CASH_DRAWER_VARIANCE,
                severity=NotificationSeverity.WARNING,
            )
        else:
            session.status = CashSession.SessionStatus.CLOSED

        session.save(update_fields=["counted_cash", "variance", "closed_by", "closed_at", "notes", "status", "updated_at"])

        # Record variance journal if non-zero
        if variance != Decimal("0.00"):
            cash_account = ChartOfAccountsService.get_system_account(session.restaurant, "1000")
            variance_account = ChartOfAccountsService.get_system_account(session.restaurant, "6700")

            lines = []
            if variance < Decimal("0.00"):  # Shortage (Expense)
                lines.append({
                    "account_id": variance_account.id,
                    "debit": abs(variance),
                    "credit": Decimal("0.00"),
                    "description": f"Cash Shortage - {session.register_name}",
                })
                lines.append({
                    "account_id": cash_account.id,
                    "debit": Decimal("0.00"),
                    "credit": abs(variance),
                    "description": f"Cash Drawer Adjustment - {session.register_name}",
                })
            else:  # Overage (Other Income / Negative Expense)
                lines.append({
                    "account_id": cash_account.id,
                    "debit": variance,
                    "credit": Decimal("0.00"),
                    "description": f"Cash Overage - {session.register_name}",
                })
                lines.append({
                    "account_id": variance_account.id,
                    "debit": Decimal("0.00"),
                    "credit": variance,
                    "description": f"Cash Drawer Overage - {session.register_name}",
                })

            DoubleEntryAccountingService.create_journal_entry(
                restaurant=session.restaurant,
                entry_date=session.closed_at.date(),
                source_document_type=JournalEntry.SourceDocumentType.CASH_PAYOUT,
                source_id=f"CASHSESSION_{session.id}",
                lines=lines,
                user=user,
                notes=f"End of shift cash drawer variance adjustment: ${variance:.2f}",
                auto_post=True,
            )

        AuditService.log(
            restaurant=session.restaurant,
            actor=user,
            action="UPDATE",
            entity_type="CASH_SESSION",
            entity_id=str(session.id),
            metadata={"counted_cash": str(counted_cash), "variance": str(variance), "status": session.status},
        )
        return session

    @classmethod
    @transaction.atomic
    def approve_variance(cls, session: CashSession, user: User, approval_notes: str = "") -> CashSession:
        session.status = CashSession.SessionStatus.CLOSED
        session.approved_by = user
        session.approval_notes = approval_notes
        session.save(update_fields=["status", "approved_by", "approval_notes", "updated_at"])
        return session


class FinancialReportingService:
    """
    Generates authoritative financial statements: P&L, Balance Sheet, Cash Flow, Trial Balance, General Ledger.
    """

    @classmethod
    def generate_trial_balance(cls, restaurant: Restaurant, as_of_date: Optional[Any] = None) -> Dict[str, Any]:
        if not as_of_date:
            as_of_date = timezone.now().date()

        accounts = Account.objects.filter(restaurant=restaurant, is_active=True).order_by("code")
        lines = []
        total_debits = Decimal("0.00")
        total_credits = Decimal("0.00")

        for acc in accounts:
            qs = JournalLine.objects.filter(
                journal_entry__restaurant=restaurant,
                journal_entry__status=JournalEntry.EntryStatus.POSTED,
                journal_entry__entry_date__lte=as_of_date,
                account=acc,
            )
            agg = qs.aggregate(dr=Sum("debit"), cr=Sum("credit"))
            dr = agg["dr"] or Decimal("0.00")
            cr = agg["cr"] or Decimal("0.00")

            if dr == Decimal("0.00") and cr == Decimal("0.00"):
                continue

            total_debits += dr
            total_credits += cr

            # Net balance according to normal balance
            if acc.normal_balance == NormalBalance.DEBIT:
                net_balance = dr - cr
            else:
                net_balance = cr - dr

            lines.append({
                "account_id": str(acc.id),
                "code": acc.code,
                "name": acc.name,
                "category": acc.category,
                "normal_balance": acc.normal_balance,
                "total_debit": str(dr),
                "total_credit": str(cr),
                "net_balance": str(net_balance),
            })

        is_balanced = abs(total_debits - total_credits) < Decimal("0.0001")

        return {
            "restaurant_id": str(restaurant.id),
            "as_of_date": str(as_of_date),
            "is_balanced": is_balanced,
            "total_debits": str(total_debits),
            "total_credits": str(total_credits),
            "difference": str(total_debits - total_credits),
            "accounts": lines,
        }

    @classmethod
    def generate_profit_and_loss(
        cls,
        restaurant: Restaurant,
        start_date: Any,
        end_date: Any,
    ) -> Dict[str, Any]:
        # 1. Revenue
        revenue_lines = JournalLine.objects.filter(
            journal_entry__restaurant=restaurant,
            journal_entry__status=JournalEntry.EntryStatus.POSTED,
            journal_entry__entry_date__gte=start_date,
            journal_entry__entry_date__lte=end_date,
            account__category=AccountCategory.REVENUE,
        )
        gross_sales_cr = revenue_lines.filter(account__code="4000").aggregate(s=Sum("credit"))["s"] or Decimal("0.00")
        delivery_cr = revenue_lines.filter(account__code="4050").aggregate(s=Sum("credit"))["s"] or Decimal("0.00")
        discounts_dr = revenue_lines.filter(account__code="4100").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")

        gross_revenue = gross_sales_cr + delivery_cr
        net_revenue = gross_revenue - discounts_dr

        # 2. Cost of Goods Sold (COGS)
        cogs_lines = JournalLine.objects.filter(
            journal_entry__restaurant=restaurant,
            journal_entry__status=JournalEntry.EntryStatus.POSTED,
            journal_entry__entry_date__gte=start_date,
            journal_entry__entry_date__lte=end_date,
            account__category=AccountCategory.EXPENSE,
            account__code__startswith="5",
        )
        cogs_food = cogs_lines.filter(account__code="5000").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        cogs_bev = cogs_lines.filter(account__code="5050").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        cogs_waste = cogs_lines.filter(account__code="5100").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        total_cogs = cogs_food + cogs_bev + cogs_waste

        # Gross Profit
        gross_profit = net_revenue - total_cogs
        gross_margin_pct = ((gross_profit / net_revenue) * Decimal("100.00")) if net_revenue > Decimal("0.00") else Decimal("0.00")

        # 3. Operating Expenses
        op_expense_lines = JournalLine.objects.filter(
            journal_entry__restaurant=restaurant,
            journal_entry__status=JournalEntry.EntryStatus.POSTED,
            journal_entry__entry_date__gte=start_date,
            journal_entry__entry_date__lte=end_date,
            account__category=AccountCategory.EXPENSE,
            account__code__startswith="6",
        )
        payroll = op_expense_lines.filter(account__code="6000").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        rent = op_expense_lines.filter(account__code="6100").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        utilities = op_expense_lines.filter(account__code="6200").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        maintenance = op_expense_lines.filter(account__code="6300").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        marketing = op_expense_lines.filter(account__code="6400").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        supplies = op_expense_lines.filter(account__code="6500").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        merchant_fees = op_expense_lines.filter(account__code="6600").aggregate(s=Sum("debit"))["s"] or Decimal("0.00")
        other_exp = op_expense_lines.exclude(account__code__in=["6000", "6100", "6200", "6300", "6400", "6500", "6600"]).aggregate(s=Sum("debit"))["s"] or Decimal("0.00")

        total_operating_expenses = (
            payroll + rent + utilities + maintenance + marketing + supplies + merchant_fees + other_exp
        )

        net_profit = gross_profit - total_operating_expenses
        net_margin_pct = ((net_profit / net_revenue) * Decimal("100.00")) if net_revenue > Decimal("0.00") else Decimal("0.00")

        return {
            "period": {"start_date": str(start_date), "end_date": str(end_date)},
            "revenue": {
                "gross_sales": str(gross_sales_cr),
                "delivery_fees": str(delivery_cr),
                "discounts": str(discounts_dr),
                "net_revenue": str(net_revenue),
            },
            "cogs": {
                "food": str(cogs_food),
                "beverage": str(cogs_bev),
                "wastage": str(cogs_waste),
                "total_cogs": str(total_cogs),
            },
            "gross_profit": str(gross_profit),
            "gross_margin_pct": f"{gross_margin_pct:.2f}%",
            "operating_expenses": {
                "payroll": str(payroll),
                "rent": str(rent),
                "utilities": str(utilities),
                "maintenance": str(maintenance),
                "marketing": str(marketing),
                "supplies": str(supplies),
                "merchant_fees": str(merchant_fees),
                "other": str(other_exp),
                "total_operating_expenses": str(total_operating_expenses),
            },
            "net_profit": str(net_profit),
            "net_margin_pct": f"{net_margin_pct:.2f}%",
        }

    @classmethod
    def generate_balance_sheet(cls, restaurant: Restaurant, as_of_date: Optional[Any] = None) -> Dict[str, Any]:
        if not as_of_date:
            as_of_date = timezone.now().date()

        def _get_category_balance(cat: AccountCategory) -> Decimal:
            lines = JournalLine.objects.filter(
                journal_entry__restaurant=restaurant,
                journal_entry__status=JournalEntry.EntryStatus.POSTED,
                journal_entry__entry_date__lte=as_of_date,
                account__category=cat,
            ).aggregate(dr=Sum("debit"), cr=Sum("credit"))
            dr = lines["dr"] or Decimal("0.00")
            cr = lines["cr"] or Decimal("0.00")
            if cat in [AccountCategory.ASSET, AccountCategory.EXPENSE]:
                return dr - cr
            return cr - dr

        total_assets = _get_category_balance(AccountCategory.ASSET)
        total_liabilities = _get_category_balance(AccountCategory.LIABILITY)
        total_equity_base = _get_category_balance(AccountCategory.EQUITY)

        # Net Income to Date (Revenue - Expense) rolls into retained equity
        total_revenue = _get_category_balance(AccountCategory.REVENUE)
        total_expense = _get_category_balance(AccountCategory.EXPENSE)
        retained_period_income = total_revenue - total_expense

        total_equity = total_equity_base + retained_period_income

        # Equation verification: Assets == Liabilities + Equity
        equation_balanced = abs(total_assets - (total_liabilities + total_equity)) < Decimal("0.0001")

        return {
            "as_of_date": str(as_of_date),
            "assets": {
                "total_assets": str(total_assets),
            },
            "liabilities": {
                "total_liabilities": str(total_liabilities),
            },
            "equity": {
                "capital": str(total_equity_base),
                "retained_period_income": str(retained_period_income),
                "total_equity": str(total_equity),
            },
            "total_liabilities_and_equity": str(total_liabilities + total_equity),
            "is_equation_balanced": equation_balanced,
        }

    @classmethod
    def generate_cash_flow(cls, restaurant: Restaurant, start_date: Any, end_date: Any) -> Dict[str, Any]:
        cash_accounts = Account.objects.filter(
            restaurant=restaurant,
            code__in=["1000", "1010", "1020", "1030"]
        )

        operating_dr = JournalLine.objects.filter(
            journal_entry__restaurant=restaurant,
            journal_entry__status=JournalEntry.EntryStatus.POSTED,
            journal_entry__entry_date__gte=start_date,
            journal_entry__entry_date__lte=end_date,
            account__in=cash_accounts,
            journal_entry__source_document_type__in=[
                JournalEntry.SourceDocumentType.SALE,
                JournalEntry.SourceDocumentType.EXPENSE,
                JournalEntry.SourceDocumentType.CASH_PAYOUT,
                JournalEntry.SourceDocumentType.SUPPLIER_PAYMENT,
            ]
        ).aggregate(dr=Sum("debit"), cr=Sum("credit"))

        cash_inflows = operating_dr["dr"] or Decimal("0.00")
        cash_outflows = operating_dr["cr"] or Decimal("0.00")
        net_cash_flow = cash_inflows - cash_outflows

        return {
            "period": {"start_date": str(start_date), "end_date": str(end_date)},
            "operating_activities": {
                "cash_inflows": str(cash_inflows),
                "cash_outflows": str(cash_outflows),
                "net_operating_cash_flow": str(net_cash_flow),
            },
            "investing_activities": {"net_cash": "0.00"},
            "financing_activities": {"net_cash": "0.00"},
            "net_cash_movement": str(net_cash_flow),
        }
