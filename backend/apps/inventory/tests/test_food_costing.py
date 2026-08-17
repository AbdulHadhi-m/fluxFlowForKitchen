from decimal import Decimal
import pytest
from django.utils import timezone
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.models import MenuItem, MenuCategory
from apps.orders.models import Order, OrderItem
from apps.inventory.models import InventoryItem, Recipe, RecipeItem, StockMovement
from apps.inventory.services import (
    InventoryService,
    RecipeService,
    FoodCostAnalyticsService,
    ReorderService,
)


@pytest.mark.django_db
class TestFoodCostingAndAnalytics:
    @pytest.fixture
    def setup_data(self):
        RBACService.seed_system_roles_and_permissions()
        user = User.objects.create_user(email="manager@cost.com", password="Password123!")
        rest, _ = RestaurantService.create_restaurant(user=user, name="Cost Analysis Kitchen")

        cat = MenuCategory.objects.create(restaurant=rest, name="Pizza")
        pizza = MenuItem.objects.create(restaurant=rest, category=cat, name="Margherita", price=Decimal("12.00"))

        flour = InventoryService.create_item(
            restaurant=rest, name="Flour", unit="kg", cost_per_unit=Decimal("1.50"), initial_quantity=Decimal("100.000"), par_level=Decimal("150.000")
        )
        cheese = InventoryService.create_item(
            restaurant=rest, name="Mozzarella", unit="kg", cost_per_unit=Decimal("8.00"), initial_quantity=Decimal("40.000"), par_level=Decimal("80.000")
        )

        recipe = Recipe.objects.create(
            restaurant=rest,
            name="Margherita BOM",
            menu_item=pizza,
            version=1,
            status=Recipe.RecipeStatus.PUBLISHED,
        )
        RecipeItem.objects.create(recipe=recipe, inventory_item=flour, quantity=Decimal("200.000"), unit="g")
        RecipeItem.objects.create(recipe=recipe, inventory_item=cheese, quantity=Decimal("150.000"), unit="g")

        return {
            "restaurant": rest,
            "user": user,
            "menu_item": pizza,
            "flour": flour,
            "cheese": cheese,
            "recipe": recipe,
        }

    def test_inventory_valuation(self, setup_data):
        rest = setup_data["restaurant"]
        # 100 kg flour ($1.50) = $150.00; 40 kg cheese ($8.00) = $320.00 -> Total $470.00
        val = FoodCostAnalyticsService.get_inventory_valuation(rest)
        assert val["total_valuation"] == "470.00"
        assert val["total_items_count"] == 2

    def test_cost_change_impact_analysis(self, setup_data):
        cheese = setup_data["cheese"]
        # Cheese price increases from $8.00 to $10.00 (+2.00/kg)
        # Dish uses 150g cheese -> delta = 0.15 * 2.00 = +$0.30
        analysis = RecipeService.analyze_cost_change_impact(cheese, Decimal("10.00"))
        assert analysis["impacted_dishes_count"] == 1
        item_impact = analysis["impacted_items"][0]
        assert item_impact["cost_delta"] == "0.30"

    def test_theoretical_vs_actual_variance(self, setup_data):
        rest = setup_data["restaurant"]
        pizza = setup_data["menu_item"]
        cheese = setup_data["cheese"]

        # Create completed order: 10 pizzas (theoretical cheese: 10 * 150g = 1.5 kg)
        order = Order.objects.create(
            restaurant=rest, order_number="ORD-7001", subtotal=Decimal("120.00"), total=Decimal("120.00"), status=Order.OrderStatus.COMPLETED
        )
        OrderItem.objects.create(order=order, menu_item=pizza, item_name_snapshot="Margherita", quantity=10, unit_price_snapshot=Decimal("12.00"), line_total=Decimal("120.00"))

        # Actual ledger shows 2.0 kg consumed (0.5 kg over-portioning/waste)
        StockMovement.objects.create(
            restaurant=rest,
            item=cheese,
            movement_type=StockMovement.MovementType.CONSUMPTION,
            quantity=Decimal("-2.000"),
            quantity_before=Decimal("40.000"),
            quantity_after=Decimal("38.000"),
            unit="kg",
            unit_cost_snapshot=cheese.weighted_average_cost or cheese.cost_per_unit,
        )

        now = timezone.now()
        variance = FoodCostAnalyticsService.get_variance_analysis(
            rest, now - timezone.timedelta(days=1), now + timezone.timedelta(days=1)
        )
        cheese_row = next(r for r in variance["items"] if r["item_id"] == str(cheese.id))
        assert cheese_row["theoretical_quantity"] == "1.500"
        assert cheese_row["actual_quantity"] == "2.000"
        assert cheese_row["variance_quantity"] == "0.500"
        # 0.5 kg * $8.00 = $4.00 variance cost
        assert cheese_row["variance_cost"] == "4.00"

    def test_reorder_suggestions(self, setup_data):
        rest = setup_data["restaurant"]
        # Flour: par=150, current=100 -> suggested 50
        # Cheese: par=80, current=40 -> suggested 40
        suggestions = ReorderService.get_reorder_suggestions(rest)
        assert len(suggestions) == 2
        sug_map = {s["item_name"]: s["suggested_reorder_quantity"] for s in suggestions}
        assert sug_map["Flour"] == "50.000"
        assert sug_map["Mozzarella"] == "40.000"
