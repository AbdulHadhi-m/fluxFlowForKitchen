from decimal import Decimal
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.models import Order
from apps.orders.services import OrderService

class OrderServiceTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Romana")
        self.user = User.objects.create_user(email="waiter@trattoria.com", password="Password123!")
        self.table = RestaurantTable.objects.create(restaurant=self.restaurant, name="T01", capacity=4)
        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Main")
        self.item1 = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Chicken Biryani",
            price=Decimal("180.00"),
            is_available=True,
            is_active=True,
        )

    def test_price_and_name_snapshot_immutability(self):
        """Historical order preserves original price and name even when catalog is modified."""
        order = OrderService.create_order(
            restaurant=self.restaurant,
            user=self.user,
            table_id=str(self.table.id),
            items_data=[{"menu_item_id": str(self.item1.id), "quantity": 2, "notes": "No onions"}],
        )

        self.assertEqual(order.subtotal, Decimal("360.00"))
        self.assertEqual(order.total, Decimal("360.00"))

        # Table is now OCCUPIED
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, RestaurantTable.TableStatus.OCCUPIED)

        # Mutate catalog MenuItem price and name
        self.item1.price = Decimal("220.00")
        self.item1.name = "Special Dum Biryani"
        self.item1.save()

        # Re-fetch order and verify snapshots are unmodified
        order.refresh_from_db()
        order_item = order.items.first()
        self.assertEqual(order_item.item_name_snapshot, "Chicken Biryani")
        self.assertEqual(order_item.unit_price_snapshot, Decimal("180.00"))
        self.assertEqual(order_item.line_total, Decimal("360.00"))
        self.assertEqual(order.total, Decimal("360.00"))

    def test_unavailable_item_rejected(self):
        """Items marked 86'd / unavailable cannot be ordered."""
        self.item1.is_available = False
        self.item1.save()

        with self.assertRaises(ValidationError):
            OrderService.create_order(
                restaurant=self.restaurant,
                user=self.user,
                items_data=[{"menu_item_id": str(self.item1.id), "quantity": 1}],
            )

    def test_order_completion_frees_table(self):
        """Completing an order frees the dining table to AVAILABLE."""
        order = OrderService.create_order(
            restaurant=self.restaurant,
            user=self.user,
            table_id=str(self.table.id),
            items_data=[{"menu_item_id": str(self.item1.id), "quantity": 1}],
        )
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, RestaurantTable.TableStatus.OCCUPIED)

        OrderService.complete_order(order)
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, RestaurantTable.TableStatus.AVAILABLE)
