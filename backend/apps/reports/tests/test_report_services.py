from datetime import timedelta
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService
from apps.billing.services import BillingService, PaymentService
from apps.reports.services import ReportService, DateFilterHelper

class ReportServiceTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Ristorante Roma")
        self.user = User.objects.create_user(email="manager@roma.com", password="Password123!")

        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Pasta")
        self.pasta = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Spaghetti Carbonara",
            price=Decimal("20.00"),
            is_available=True,
            is_active=True,
        )

        # Create Order + Bill + Payment
        self.order = OrderService.create_order(
            restaurant=self.restaurant,
            user=self.user,
            items_data=[{"menu_item_id": str(self.pasta.id), "quantity": 3}], # $60.00
        )
        self.bill = BillingService.create_bill_for_order(
            restaurant=self.restaurant,
            order=self.order,
            user=self.user,
        )
        PaymentService.process_payment(
            restaurant=self.restaurant,
            bill=self.bill,
            payment_method="CASH",
            amount=self.bill.grand_total,
            user=self.user,
        )

    def test_sales_and_payment_aggregation(self):
        """ReportService accurately aggregates sales and payments over time range."""
        start_dt, end_dt = DateFilterHelper.get_range("LAST_7_DAYS")

        sales_data = ReportService.get_sales_report(self.restaurant, start_dt, end_dt)
        self.assertEqual(sales_data["summary"]["bill_count"], 1)
        self.assertEqual(sales_data["summary"]["gross_sales"], "60.00")
        self.assertEqual(sales_data["summary"]["total_paid"], str(self.bill.grand_total))

        payment_data = ReportService.get_payment_report(self.restaurant, start_dt, end_dt)
        self.assertEqual(payment_data["total_transactions"], 1)
        self.assertEqual(payment_data["breakdown"][0]["payment_method"], "CASH")
        self.assertEqual(payment_data["breakdown"][0]["total_amount"], str(self.bill.grand_total))

        popular_items = ReportService.get_popular_items(self.restaurant, start_dt, end_dt)
        self.assertEqual(len(popular_items), 1)
        self.assertEqual(popular_items[0]["item_name"], "Spaghetti Carbonara")
        self.assertEqual(popular_items[0]["quantity_sold"], 3)
        self.assertEqual(popular_items[0]["revenue"], "60.00")
