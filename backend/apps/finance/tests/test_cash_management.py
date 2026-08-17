import pytest
from decimal import Decimal
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.finance.models import CashSession, CashTransaction, JournalEntry
from apps.finance.services import CashManagementService

@pytest.mark.django_db
class TestCashManagement:
    @pytest.fixture
    def restaurant(self):
        return Restaurant.objects.create(name="Trattoria Bella", slug="trattoria-bella")

    @pytest.fixture
    def user(self):
        return User.objects.create_user(
            email="cashier@kitchen.com",
            password="Password123!",
            first_name="Luigi",
            last_name="Verdi",
        )

    def test_cash_session_lifecycle_with_payout_and_reconciliation(self, restaurant, user):
        # 1. Open session with $200 float
        session = CashManagementService.open_session(
            restaurant=restaurant,
            register_name="Main POS Drawer",
            opening_balance=Decimal("200.00"),
            user=user,
        )
        assert session.status == CashSession.SessionStatus.OPEN
        assert session.expected_cash == Decimal("200.00")

        # 2. Record Cash Sale of $150
        CashManagementService.record_cash_transaction(
            session=session,
            transaction_type=CashTransaction.TransactionType.SALE,
            amount=Decimal("150.00"),
            reason="Lunch cash sales",
            user=user,
        )
        assert session.expected_cash == Decimal("350.00")
        assert session.cash_sales == Decimal("150.00")

        # 3. Record Petty Cash Payout of $25
        CashManagementService.record_cash_transaction(
            session=session,
            transaction_type=CashTransaction.TransactionType.PAYOUT,
            amount=Decimal("25.00"),
            reason="Emergency ice purchase",
            user=user,
        )
        assert session.expected_cash == Decimal("325.00")
        assert session.cash_payouts == Decimal("25.00")

        # 4. Close session with counted cash $320 (Shortage of $5)
        closed_session = CashManagementService.close_session(
            session=session,
            counted_cash=Decimal("320.00"),
            user=user,
            notes="End of shift count",
        )
        assert closed_session.status == CashSession.SessionStatus.CLOSED
        assert closed_session.variance == Decimal("-5.00")

        # Verify automated variance journal created
        je = JournalEntry.objects.filter(
            restaurant=restaurant,
            source_id=f"CASHSESSION_{session.id}"
        ).first()
        assert je is not None
        assert je.is_balanced is True
        assert je.total_debit == Decimal("5.00")
