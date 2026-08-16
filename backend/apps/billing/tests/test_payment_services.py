from decimal import Decimal
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService
from apps.billing.models import Bill, Payment
from apps.billing.services import BillingService, PaymentService

class PaymentServiceTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Osteria Francescana")
        self.user = User.objects.create_user(email="cashier@osteria.com", password="Password123!")
        self.table = RestaurantTable.objects.create(restaurant=self.restaurant, name="T01", capacity=2, status=RestaurantTable.TableStatus.OCCUPIED)
        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Pasta")
        self.item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Tortellini",
            price=Decimal("50.00"),
            is_available=True,
            is_active=True,
        )
        self.order = OrderService.create_order(
            restaurant=self.restaurant,
            user=self.user,
            table_id=self.table.id,
            items_data=[{"menu_item_id": str(self.item.id), "quantity": 2}], # 100.00 + 5% tax = 105.00
        )
        self.bill = BillingService.create_bill_for_order(
            restaurant=self.restaurant,
            user=self.user,
            order=self.order,
        )

    def test_cash_payment_with_change_calculation(self):
        """Paying 105.00 with 150.00 cash gives 45.00 change and marks bill PAID."""
        payment = PaymentService.process_payment(
            restaurant=self.restaurant,
            user=self.user,
            bill=self.bill,
            amount=Decimal("105.00"),
            payment_method=Payment.PaymentMethod.CASH,
            amount_tendered=Decimal("150.00"),
        )
        self.assertEqual(payment.change_returned, Decimal("45.00"))
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.status, Bill.BillStatus.PAID)
        self.assertEqual(self.bill.balance_due, Decimal("0.00"))
        self.assertEqual(self.bill.total_paid, Decimal("105.00"))

        # Table is freed
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, RestaurantTable.TableStatus.AVAILABLE)

    def test_split_and_partial_payments(self):
        """Tender 1: 50.00 Card -> PARTIALLY_PAID. Tender 2: 55.00 UPI -> PAID."""
        # 1. First tender
        PaymentService.process_payment(
            restaurant=self.restaurant,
            user=self.user,
            bill=self.bill,
            amount=Decimal("50.00"),
            payment_method=Payment.PaymentMethod.CARD,
        )
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.status, Bill.BillStatus.PARTIALLY_PAID)
        self.assertEqual(self.bill.balance_due, Decimal("55.00"))

        # 2. Second tender
        PaymentService.process_payment(
            restaurant=self.restaurant,
            user=self.user,
            bill=self.bill,
            amount=Decimal("55.00"),
            payment_method=Payment.PaymentMethod.UPI,
        )
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.status, Bill.BillStatus.PAID)
        self.assertEqual(self.bill.balance_due, Decimal("0.00"))

    def test_payment_idempotency_protection(self):
        """Submitting duplicate payment request with identical idempotency_key returns original payment."""
        key = "idemp-test-uuid-999"
        p1 = PaymentService.process_payment(
            restaurant=self.restaurant,
            user=self.user,
            bill=self.bill,
            amount=Decimal("50.00"),
            idempotency_key=key,
        )
        p2 = PaymentService.process_payment(
            restaurant=self.restaurant,
            user=self.user,
            bill=self.bill,
            amount=Decimal("50.00"),
            idempotency_key=key,
        )
        self.assertEqual(p1.id, p2.id)
        self.assertEqual(Payment.objects.filter(restaurant=self.restaurant).count(), 1)
