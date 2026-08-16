from decimal import Decimal
from django.test import TestCase
from django.db.utils import IntegrityError
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.models import Order, OrderItem

class OrderModelTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Romana")
        self.user = User.objects.create_user(email="chef@trattoria.com", password="Password123!")
        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Pasta")
        self.menu_item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Spaghetti Carbonara",
            price=Decimal("15.50"),
        )

    def test_unique_order_number_per_restaurant(self):
        """Order number is unique within a restaurant organization."""
        Order.objects.create(
            restaurant=self.restaurant,
            order_number="ORD-000001",
            created_by=self.user,
        )

        with self.assertRaises(IntegrityError):
            Order.objects.create(
                restaurant=self.restaurant,
                order_number="ORD-000001",
                created_by=self.user,
            )

    def test_order_item_line_total_calculation(self):
        """OrderItem auto-calculates line total on save."""
        order = Order.objects.create(
            restaurant=self.restaurant,
            order_number="ORD-000002",
            created_by=self.user,
        )
        item = OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            item_name_snapshot="Spaghetti Carbonara",
            unit_price_snapshot=Decimal("15.50"),
            quantity=3,
        )
        self.assertEqual(item.line_total, Decimal("46.50"))
