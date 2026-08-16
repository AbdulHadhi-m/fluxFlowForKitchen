from decimal import Decimal
from django.test import TestCase
from apps.restaurants.models import Restaurant
from apps.inventory.models import InventoryItem, StockMovement

class InventoryModelTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Toscana")

    def test_inventory_item_status_property(self):
        """Computed stock_status reflects current_quantity and minimum threshold."""
        item = InventoryItem.objects.create(
            restaurant=self.restaurant,
            name="Parmigiano Reggiano",
            unit="kg",
            current_quantity=Decimal("15.000"),
            minimum_stock_level=Decimal("5.000"),
        )
        self.assertEqual(item.stock_status, "IN_STOCK")

        item.current_quantity = Decimal("4.000")
        item.save()
        self.assertEqual(item.stock_status, "LOW_STOCK")

        item.current_quantity = Decimal("0.000")
        item.save()
        self.assertEqual(item.stock_status, "OUT_OF_STOCK")
