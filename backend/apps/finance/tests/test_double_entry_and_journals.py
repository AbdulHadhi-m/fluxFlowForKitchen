import pytest
from decimal import Decimal
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.finance.models import Account, JournalEntry, FinancialPeriod
from apps.finance.services import ChartOfAccountsService, DoubleEntryAccountingService

@pytest.mark.django_db
class TestDoubleEntryAndJournals:
    @pytest.fixture
    def restaurant(self):
        return Restaurant.objects.create(name="Trattoria Bella", slug="trattoria-bella")

    @pytest.fixture
    def user(self):
        return User.objects.create_user(
            email="accountant@kitchen.com",
            password="Password123!",
            first_name="Marco",
            last_name="Conti",
        )

    def test_balanced_journal_entry_creation_and_posting(self, restaurant, user):
        ChartOfAccountsService.seed_default_chart_of_accounts(restaurant)
        cash_acc = Account.objects.get(restaurant=restaurant, code="1000")
        sales_acc = Account.objects.get(restaurant=restaurant, code="4000")

        lines = [
            {"account_id": cash_acc.id, "debit": Decimal("150.00"), "credit": Decimal("0.00"), "description": "Cash Sales"},
            {"account_id": sales_acc.id, "debit": Decimal("0.00"), "credit": Decimal("150.00"), "description": "Sales Revenue"},
        ]

        entry = DoubleEntryAccountingService.create_journal_entry(
            restaurant=restaurant,
            entry_date=timezone.now().date(),
            source_document_type=JournalEntry.SourceDocumentType.SALE,
            lines=lines,
            user=user,
            notes="Daily manual cash sales",
            auto_post=False,
        )

        assert entry.status == JournalEntry.EntryStatus.DRAFT
        assert entry.is_balanced is True
        assert entry.total_debit == Decimal("150.00")
        assert entry.total_credit == Decimal("150.00")

        posted_entry = DoubleEntryAccountingService.post_journal_entry(entry, user)
        assert posted_entry.status == JournalEntry.EntryStatus.POSTED
        assert posted_entry.posted_by == user

    def test_unbalanced_journal_rejected(self, restaurant, user):
        ChartOfAccountsService.seed_default_chart_of_accounts(restaurant)
        cash_acc = Account.objects.get(restaurant=restaurant, code="1000")
        sales_acc = Account.objects.get(restaurant=restaurant, code="4000")

        lines = [
            {"account_id": cash_acc.id, "debit": Decimal("150.00"), "credit": Decimal("0.00")},
            {"account_id": sales_acc.id, "debit": Decimal("0.00"), "credit": Decimal("100.00")},
        ]

        with pytest.raises(ValidationError, match="Unbalanced journal entry"):
            DoubleEntryAccountingService.create_journal_entry(
                restaurant=restaurant,
                entry_date=timezone.now().date(),
                source_document_type=JournalEntry.SourceDocumentType.SALE,
                lines=lines,
                user=user,
            )

    def test_voiding_creates_reversing_journal(self, restaurant, user):
        ChartOfAccountsService.seed_default_chart_of_accounts(restaurant)
        cash_acc = Account.objects.get(restaurant=restaurant, code="1000")
        sales_acc = Account.objects.get(restaurant=restaurant, code="4000")

        lines = [
            {"account_id": cash_acc.id, "debit": Decimal("200.00"), "credit": Decimal("0.00")},
            {"account_id": sales_acc.id, "debit": Decimal("0.00"), "credit": Decimal("200.00")},
        ]

        entry = DoubleEntryAccountingService.create_journal_entry(
            restaurant=restaurant,
            entry_date=timezone.now().date(),
            source_document_type=JournalEntry.SourceDocumentType.SALE,
            lines=lines,
            user=user,
            auto_post=True,
        )

        reversal = DoubleEntryAccountingService.void_journal_entry(entry, user, reason="Customer canceled check")
        assert entry.status == JournalEntry.EntryStatus.VOIDED
        assert reversal.status == JournalEntry.EntryStatus.POSTED
        assert reversal.lines.count() == 2
        # Verify reversal swapped debits and credits
        rev_cash_line = reversal.lines.get(account=cash_acc)
        assert rev_cash_line.credit == Decimal("200.00")
        assert rev_cash_line.debit == Decimal("0.00")
