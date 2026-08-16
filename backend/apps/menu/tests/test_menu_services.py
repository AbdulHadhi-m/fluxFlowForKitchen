from decimal import Decimal
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.menu.services import MenuService

class MenuServiceTests(TestCase):
    def setUp(self):
        self.r1 = Restaurant.objects.create(name="Restaurant Alpha")
        self.r2 = Restaurant.objects.create(name="Restaurant Beta")
        self.cat1 = MenuService.create_category(self.r1, name="Beverages", display_order=1)
        self.cat2 = MenuService.create_category(self.r2, name="Beverages", display_order=1)

    def test_create_menu_item_cross_tenant_rejection(self):
        """Restaurant 1 creating item cannot reference category from Restaurant 2."""
        with self.assertRaises(ValidationError):
            MenuService.create_menu_item(
                restaurant=self.r1,
                category_id=self.cat2.id,  # Category from Restaurant 2
                name="Espresso",
                price=Decimal("3.50"),
            )

    def test_negative_price_rejected(self):
        """Negative prices are rejected."""
        with self.assertRaises(ValidationError):
            MenuService.create_menu_item(
                restaurant=self.r1,
                category_id=self.cat1.id,
                name="Discount Soda",
                price=Decimal("-1.00"),
            )

    def test_toggle_item_availability(self):
        """Toggle availability (live ordering vs 86'd)."""
        item = MenuService.create_menu_item(
            restaurant=self.r1,
            category_id=self.cat1.id,
            name="Iced Tea",
            price=Decimal("4.00"),
            is_available=True,
        )
        MenuService.set_item_availability(item, is_available=False)
        item.refresh_from_db()
        self.assertFalse(item.is_available)
        self.assertTrue(item.is_active)  # Catalog presence preserved
