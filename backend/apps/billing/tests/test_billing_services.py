from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService
from apps.billing.models import Bill, TaxRule
from apps.billing.services import BillingService

class BillingServiceTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Osteria Francescana")
        self.user = User.objects.create_user(email="cashier@osteria.com", password="Password123!")
        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Pasta")
        self.item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Tagliatelle al Ragu",
            price=Decimal("20.00"),
            is_available=True,
            is_active=True,
        )
        self.order = OrderService.create_order(
            restaurant=self.restaurant,
            user=self.user,
            items_data=[{"menu_item_id": str(self.item.id), "quantity": 2}], # subtotal = 40.00
        )
        TaxRule.objects.create(restaurant=self.restaurant, name="VAT", rate=Decimal("10.00"))

    def test_bill_generation_with_tax_and_percentage_discount(self):
        """Subtotal 40, 10% discount (-4), 10% tax on 36 (+3.60) = Grand Total 39.60."""
        bill = BillingService.create_bill_for_order(
            restaurant=self.restaurant,
            user=self.user,
            order=self.order,
            discount_type=Bill.DiscountType.PERCENTAGE,
            discount_value=Decimal("10.00"),
        )
        self.assertEqual(bill.subtotal, Decimal("40.00"))
        self.assertEqual(bill.discount_amount, Decimal("4.00"))
        self.assertEqual(bill.tax_rate_snapshot, Decimal("10.00"))
        self.assertEqual(bill.tax_amount, Decimal("3.60"))
        self.assertEqual(bill.grand_total, Decimal("39.60"))
        self.assertEqual(bill.balance_due, Decimal("39.60"))

    def test_historical_immutability_on_menu_price_change(self):
        """Altering catalog menu item price after bill generation does not alter frozen bill items."""
        bill = BillingService.create_bill_for_order(
            restaurant=self.restaurant,
            user=self.user,
            order=self.order,
        )
        self.assertEqual(bill.subtotal, Decimal("40.00"))

        # Catalog price updated to 50.00
        self.item.price = Decimal("50.00")
        self.item.save()

        bill.refresh_from_db()
        self.assertEqual(bill.subtotal, Decimal("40.00"))
        self.assertEqual(bill.items.first().unit_price_snapshot, Decimal("20.00"))
