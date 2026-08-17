import pytest
from decimal import Decimal
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.finance.models import Account, Expense, FinancialPeriod, JournalEntry
from apps.finance.services import ChartOfAccountsService, DoubleEntryAccountingService

@pytest.mark.django_db
class TestExpensesAndPeriods:
    @pytest.fixture
    def restaurant(self):
        return Restaurant.objects.create(name="Trattoria Bella", slug="trattoria-bella")

    @pytest.fixture
    def user(self):
        return User.objects.create_user(
            email="chef@kitchen.com",
            password="Password123!",
            first_name="Marco",
            last_name="Conti",
        )

    def test_closed_period_prevents_journal_posting(self, restaurant, user):
        ChartOfAccountsService.seed_default_chart_of_accounts(restaurant)
        cash_acc = Account.objects.get(restaurant=restaurant, code="1000")
        sales_acc = Account.objects.get(restaurant=restaurant, code="4000")

        # Create closed period for last month
        FinancialPeriod.objects.create(
            restaurant=restaurant,
            name="Past Period",
            start_date="2026-01-01",
            end_date="2026-01-31",
            status=FinancialPeriod.PeriodStatus.CLOSED,
        )

        lines = [
            {"account_id": cash_acc.id, "debit": Decimal("50.00"), "credit": Decimal("0.00")},
            {"account_id": sales_acc.id, "debit": Decimal("0.00"), "credit": Decimal("50.00")},
        ]

        with pytest.raises(ValidationError, match="closed financial period"):
            DoubleEntryAccountingService.create_journal_entry(
                restaurant=restaurant,
                entry_date="2026-01-15",
                source_document_type=JournalEntry.SourceDocumentType.SALE,
                lines=lines,
                user=user,
            )
