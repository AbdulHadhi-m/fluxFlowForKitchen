from decimal import Decimal
from django.test import TestCase
from django.db.utils import IntegrityError
from apps.restaurants.models import Restaurant
from apps.menu.models import MenuCategory, MenuItem

class MenuModelTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Bella")

    def test_category_unique_name_per_restaurant(self):
        """Verify unique category name per restaurant."""
        MenuCategory.objects.create(restaurant=self.restaurant, name="Starters", display_order=1)

        with self.assertRaises(IntegrityError):
            MenuCategory.objects.create(restaurant=self.restaurant, name="Starters", display_order=2)

    def test_menu_item_creation_and_ordering(self):
        """Verify menu item attributes and price Decimal storage."""
        category = MenuCategory.objects.create(restaurant=self.restaurant, name="Main Course")
        item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=category,
            name="Margherita Pizza",
            price=Decimal("14.50"),
            is_available=True,
            is_active=True,
            display_order=1,
        )
        self.assertEqual(item.price, Decimal("14.50"))
        self.assertTrue(item.is_available)
        self.assertTrue(item.is_active)
