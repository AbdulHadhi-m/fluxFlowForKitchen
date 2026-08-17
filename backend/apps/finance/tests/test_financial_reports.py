import pytest
from decimal import Decimal
from django.utils import timezone
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.finance.models import Account, JournalEntry
from apps.finance.services import (
    ChartOfAccountsService,
    DoubleEntryAccountingService,
    FinancialReportingService,
)

@pytest.mark.django_db
class TestFinancialReports:
    @pytest.fixture
    def restaurant(self):
        return Restaurant.objects.create(name="Trattoria Bella", slug="trattoria-bella")

    @pytest.fixture
    def user(self):
        return User.objects.create_user(
            email="manager@kitchen.com",
            password="Password123!",
            first_name="Marco",
            last_name="Conti",
        )

    def test_trial_balance_and_profit_loss(self, restaurant, user):
        ChartOfAccountsService.seed_default_chart_of_accounts(restaurant)
        cash_acc = Account.objects.get(restaurant=restaurant, code="1000")
        sales_acc = Account.objects.get(restaurant=restaurant, code="4000")
        cogs_acc = Account.objects.get(restaurant=restaurant, code="5000")
        rent_acc = Account.objects.get(restaurant=restaurant, code="6100")
        bank_acc = Account.objects.get(restaurant=restaurant, code="1010")

        today = timezone.now().date()

        # Sale: Cash 1000, Revenue 1000
        DoubleEntryAccountingService.create_journal_entry(
            restaurant=restaurant,
            entry_date=today,
            source_document_type=JournalEntry.SourceDocumentType.SALE,
            lines=[
                {"account_id": cash_acc.id, "debit": Decimal("1000.00"), "credit": Decimal("0.00")},
                {"account_id": sales_acc.id, "debit": Decimal("0.00"), "credit": Decimal("1000.00")},
            ],
            user=user,
            auto_post=True,
        )

        # COGS: COGS 300, Cash 300
        DoubleEntryAccountingService.create_journal_entry(
            restaurant=restaurant,
            entry_date=today,
            source_document_type=JournalEntry.SourceDocumentType.ADJUSTMENT,
            lines=[
                {"account_id": cogs_acc.id, "debit": Decimal("300.00"), "credit": Decimal("0.00")},
                {"account_id": cash_acc.id, "debit": Decimal("0.00"), "credit": Decimal("300.00")},
            ],
            user=user,
            auto_post=True,
        )

        # Rent: Rent 200, Bank 200
        DoubleEntryAccountingService.create_journal_entry(
            restaurant=restaurant,
            entry_date=today,
            source_document_type=JournalEntry.SourceDocumentType.EXPENSE,
            lines=[
                {"account_id": rent_acc.id, "debit": Decimal("200.00"), "credit": Decimal("0.00")},
                {"account_id": bank_acc.id, "debit": Decimal("0.00"), "credit": Decimal("200.00")},
            ],
            user=user,
            auto_post=True,
        )

        # 1. Trial Balance Check
        tb = FinancialReportingService.generate_trial_balance(restaurant, today)
        assert tb["is_balanced"] is True
        assert Decimal(tb["total_debits"]) == Decimal(tb["total_credits"]) == Decimal("1500.00")

        # 2. Profit & Loss Check
        pnl = FinancialReportingService.generate_profit_and_loss(restaurant, today, today)
        assert Decimal(pnl["revenue"]["gross_sales"]) == Decimal("1000.00")
        assert Decimal(pnl["cogs"]["total_cogs"]) == Decimal("300.00")
        assert Decimal(pnl["gross_profit"]) == Decimal("700.00")
        assert Decimal(pnl["operating_expenses"]["rent"]) == Decimal("200.00")
        assert Decimal(pnl["net_profit"]) == Decimal("500.00")

        # 3. Balance Sheet Check
        bs = FinancialReportingService.generate_balance_sheet(restaurant, today)
        assert bs["is_equation_balanced"] is True
