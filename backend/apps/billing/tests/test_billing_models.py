from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.orders.models import Order
from apps.billing.models import Bill, BillItem, Payment, TaxRule

class BillingModelTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Osteria Francescana")
        self.user = User.objects.create_user(email="cashier@osteria.com", password="Password123!")
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            order_number="ORD-000001",
            created_by=self.user,
        )

    def test_bill_and_item_creation(self):
        """Bill and BillItem initialize with correct defaults."""
        bill = Bill.objects.create(
            restaurant=self.restaurant,
            order=self.order,
            bill_number="BILL-000001",
            created_by=self.user,
            subtotal=Decimal("100.00"),
            grand_total=Decimal("105.00"),
            balance_due=Decimal("105.00"),
        )
        self.assertEqual(bill.status, Bill.BillStatus.DRAFT)
        self.assertEqual(bill.total_paid, Decimal("0.00"))

        item = BillItem.objects.create(
            bill=bill,
            item_name_snapshot="Risotto",
            unit_price_snapshot=Decimal("25.00"),
            quantity=4,
            line_total=Decimal("100.00"),
        )
        self.assertEqual(item.quantity, 4)
