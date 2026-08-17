from decimal import Decimal
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService
from apps.inventory.models import InventoryItem, StockMovement, Recipe, RecipeItem
from apps.inventory.services import InventoryService

class InventoryServiceTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Toscana")
        self.user = User.objects.create_user(email="chef@toscana.com", password="Password123!")

        self.chicken = InventoryService.create_item(
            restaurant=self.restaurant,
            name="Chicken Breast",
            unit="kg",
            minimum_stock_level=Decimal("10.000"),
            initial_quantity=Decimal("20.000"),
            user=self.user,
        )
        self.rice = InventoryService.create_item(
            restaurant=self.restaurant,
            name="Basmati Rice",
            unit="kg",
            minimum_stock_level=Decimal("15.000"),
            initial_quantity=Decimal("30.000"),
            user=self.user,
        )

        # Menu item & Recipe
        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Mains")
        self.biriyani = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Chicken Biriyani",
            price=Decimal("18.00"),
            is_available=True,
            is_active=True,
        )
        self.recipe = Recipe.objects.create(restaurant=self.restaurant, menu_item=self.biriyani, output_quantity=Decimal("1.000"))
        RecipeItem.objects.create(recipe=self.recipe, inventory_item=self.chicken, quantity=Decimal("0.250"), unit="kg") # 250g chicken
        RecipeItem.objects.create(recipe=self.recipe, inventory_item=self.rice, quantity=Decimal("0.200"), unit="kg") # 200g rice

    def test_stock_intake_and_adjustments(self):
        """Stock intake increases balance, manual adjustment adjusts."""
        # 1. Receive +10 kg
        InventoryService.receive_stock(
            restaurant=self.restaurant,
            item=self.chicken,
            quantity=Decimal("10.000"),
            unit="kg",
            reason="Fresh delivery",
            user=self.user,
        )
        self.chicken.refresh_from_db()
        self.assertEqual(self.chicken.current_quantity, Decimal("30.000"))

        # 2. Adjust -5 kg
        InventoryService.adjust_stock(
            restaurant=self.restaurant,
            item=self.chicken,
            delta_quantity=Decimal("-5.000"),
            reason="Audit adjustment",
            user=self.user,
        )
        self.chicken.refresh_from_db()
        self.assertEqual(self.chicken.current_quantity, Decimal("25.000"))

    def test_automatic_recipe_consumption_on_order(self):
        """Order of 2x Chicken Biriyani deducts 0.5kg chicken and 0.4kg rice exactly once."""
        order = OrderService.create_order(
            restaurant=self.restaurant,
            user=self.user,
            items_data=[{"menu_item_id": str(self.biriyani.id), "quantity": 2}],
        )

        # Trigger consumption
        InventoryService.consume_stock_for_order(order)
        self.chicken.refresh_from_db()
        self.rice.refresh_from_db()
        self.assertEqual(self.chicken.current_quantity, Decimal("19.500")) # 20 - 0.5
        self.assertEqual(self.rice.current_quantity, Decimal("29.600")) # 30 - 0.4

        # Idempotency check
        InventoryService.consume_stock_for_order(order)
        self.chicken.refresh_from_db()
        self.assertEqual(self.chicken.current_quantity, Decimal("19.500"))

    def test_insufficient_stock_wastage_rejection(self):
        """Cannot waste more than current available stock."""
        with self.assertRaises(ValidationError):
            InventoryService.record_wastage(
                restaurant=self.restaurant,
                item=self.chicken,
                quantity=Decimal("25.000"), # only 20 available
                user=self.user,
            )
