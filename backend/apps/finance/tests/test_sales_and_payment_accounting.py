import pytest
from decimal import Decimal
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.orders.models import Order
from apps.billing.models import Bill, Payment
from apps.finance.models import JournalEntry, Account
from apps.finance.services import ChartOfAccountsService, SalesAccountingService

@pytest.mark.django_db
class TestSalesAndPaymentAccounting:
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

    @pytest.fixture
    def order(self, restaurant, user):
        return Order.objects.create(
            restaurant=restaurant,
            order_number="ORD-0001",
            order_type=Order.OrderType.DINE_IN,
            created_by=user,
            subtotal=Decimal("100.00"),
            total=Decimal("110.00"),
        )

    @pytest.fixture
    def bill(self, restaurant, order, user):
        return Bill.objects.create(
            restaurant=restaurant,
            order=order,
            bill_number="BILL-0001",
            created_by=user,
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("10.00"),
            discount_amount=Decimal("0.00"),
            service_charge_amount=Decimal("0.00"),
            grand_total=Decimal("110.00"),
            total_paid=Decimal("110.00"),
            balance_due=Decimal("0.00"),
            status=Bill.BillStatus.PAID,
        )

    def test_record_bill_payment_accounting_cash(self, restaurant, bill, user):
        payment = Payment.objects.create(
            restaurant=restaurant,
            bill=bill,
            payment_method=Payment.PaymentMethod.CASH,
            amount=Decimal("110.00"),
            received_by=user,
            status=Payment.PaymentStatus.SUCCESS,
        )

        je = SalesAccountingService.record_bill_payment_accounting(payment, user)
        assert je is not None
        assert je.status == JournalEntry.EntryStatus.POSTED
        assert je.is_balanced is True
        assert je.total_debit == Decimal("110.00")
        assert je.total_credit == Decimal("110.00")

        # Cash Debit 110.00
        cash_acc = Account.objects.get(restaurant=restaurant, code="1000")
        assert je.lines.get(account=cash_acc).debit == Decimal("110.00")

        # Revenue Credit 100.00, Tax Credit 10.00
        sales_acc = Account.objects.get(restaurant=restaurant, code="4000")
        tax_acc = Account.objects.get(restaurant=restaurant, code="2100")
        assert je.lines.get(account=sales_acc).credit == Decimal("100.00")
        assert je.lines.get(account=tax_acc).credit == Decimal("10.00")

    def test_sales_accounting_is_idempotent(self, restaurant, bill, user):
        payment = Payment.objects.create(
            restaurant=restaurant,
            bill=bill,
            payment_method=Payment.PaymentMethod.CARD,
            amount=Decimal("110.00"),
            received_by=user,
            status=Payment.PaymentStatus.SUCCESS,
        )

        je1 = SalesAccountingService.record_bill_payment_accounting(payment, user)
        je2 = SalesAccountingService.record_bill_payment_accounting(payment, user)

        assert je1.id == je2.id
        assert JournalEntry.objects.filter(restaurant=restaurant, source_id=f"PAYMENT_{payment.id}").count() == 1
