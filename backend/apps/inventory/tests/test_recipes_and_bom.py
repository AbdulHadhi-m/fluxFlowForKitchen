from decimal import Decimal
import pytest
from rest_framework.exceptions import ValidationError
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.models import MenuItem, MenuCategory
from apps.inventory.models import InventoryItem, Recipe, RecipeItem, UnitOfMeasure
from apps.inventory.services import InventoryService, RecipeService


@pytest.mark.django_db
class TestRecipesAndBOM:
    @pytest.fixture
    def setup_data(self):
        RBACService.seed_system_roles_and_permissions()
        user = User.objects.create_user(email="chef@ristorante.com", password="Password123!")
        rest, _ = RestaurantService.create_restaurant(user=user, name="Chef Kitchen")

        cat = MenuCategory.objects.create(restaurant=rest, name="Mains")
        dish = MenuItem.objects.create(restaurant=rest, category=cat, name="Classic Burger", price=Decimal("15.00"))

        beef = InventoryService.create_item(
            restaurant=rest, name="Minced Beef", unit="kg", cost_per_unit=Decimal("10.00"), initial_quantity=Decimal("50.000")
        )
        bun = InventoryService.create_item(
            restaurant=rest, name="Brioche Bun", unit="piece", cost_per_unit=Decimal("0.50"), initial_quantity=Decimal("100.000")
        )
        cheese = InventoryService.create_item(
            restaurant=rest, name="Cheddar Slice", unit="piece", cost_per_unit=Decimal("0.30"), initial_quantity=Decimal("100.000")
        )
        onion = InventoryService.create_item(
            restaurant=rest, name="Onion", unit="kg", cost_per_unit=Decimal("2.00"), initial_quantity=Decimal("20.000")
        )

        return {
            "restaurant": rest,
            "user": user,
            "menu_item": dish,
            "beef": beef,
            "bun": bun,
            "cheese": cheese,
            "onion": onion,
        }

    def test_recipe_creation_and_costing(self, setup_data):
        rest = setup_data["restaurant"]
        dish = setup_data["menu_item"]
        beef = setup_data["beef"]
        bun = setup_data["bun"]
        cheese = setup_data["cheese"]

        # Recipe requires: 200g beef ($2.00), 1 bun ($0.50), 1 cheese ($0.30) -> Total $2.80
        recipe = Recipe.objects.create(
            restaurant=rest,
            name="Classic Burger BOM",
            menu_item=dish,
            version=1,
            status=Recipe.RecipeStatus.PUBLISHED,
        )
        RecipeItem.objects.create(recipe=recipe, inventory_item=beef, quantity=Decimal("200.000"), unit="g")
        RecipeItem.objects.create(recipe=recipe, inventory_item=bun, quantity=Decimal("1.000"), unit="piece")
        RecipeItem.objects.create(recipe=recipe, inventory_item=cheese, quantity=Decimal("1.000"), unit="piece")

        cost = RecipeService.calculate_recipe_cost(recipe)
        assert cost == Decimal("2.80")

        # Menu food cost analysis: Selling $15.00, Cost $2.80 -> 18.67%
        analysis = RecipeService.get_menu_item_food_cost_analysis(dish)
        assert analysis["has_recipe"] is True
        assert analysis["recipe_cost"] == "2.80"
        assert analysis["food_cost_percentage"] == "18.67"
        assert analysis["gross_margin"] == "12.20"

    def test_sub_recipe_recursion_and_explosion(self, setup_data):
        rest = setup_data["restaurant"]
        dish = setup_data["menu_item"]
        beef = setup_data["beef"]
        onion = setup_data["onion"]
        bun = setup_data["bun"]

        # 1. Sub-recipe: Patty Prep (produces 1 patty: 180g beef + 20g onion)
        patty_recipe = Recipe.objects.create(
            restaurant=rest,
            name="Beef Patty Prep",
            recipe_type=Recipe.RecipeType.SUB_RECIPE,
            version=1,
            status=Recipe.RecipeStatus.PUBLISHED,
        )
        RecipeItem.objects.create(recipe=patty_recipe, inventory_item=beef, quantity=Decimal("180.000"), unit="g")
        RecipeItem.objects.create(recipe=patty_recipe, inventory_item=onion, quantity=Decimal("20.000"), unit="g")

        # 2. Main Recipe: uses 1 Patty Prep + 1 Bun
        main_recipe = Recipe.objects.create(
            restaurant=rest,
            name="Burger with Prep",
            menu_item=dish,
            version=1,
            status=Recipe.RecipeStatus.PUBLISHED,
        )
        RecipeItem.objects.create(recipe=main_recipe, sub_recipe=patty_recipe, quantity=Decimal("1.000"), unit="portion")
        RecipeItem.objects.create(recipe=main_recipe, inventory_item=bun, quantity=Decimal("1.000"), unit="piece")

        # Exploded ingredients should have Beef (180g), Onion (20g), Bun (1pc)
        exploded = RecipeService.explode_recipe_ingredients(main_recipe, Decimal("1.000"))
        items_map = {item.name: qty for item, qty, unit in exploded}
        assert items_map["Minced Beef"] == Decimal("180.000")
        assert items_map["Onion"] == Decimal("20.000")
        assert items_map["Brioche Bun"] == Decimal("1.000")

    def test_circular_dependency_rejection(self, setup_data):
        rest = setup_data["restaurant"]

        # Recipe A and Recipe B
        recipe_a = Recipe.objects.create(restaurant=rest, name="Recipe A", version=1)
        recipe_b = Recipe.objects.create(restaurant=rest, name="Recipe B", version=1)

        RecipeItem.objects.create(recipe=recipe_a, sub_recipe=recipe_b, quantity=Decimal("1.000"), unit="portion")

        # Adding Recipe A as sub_recipe to Recipe B must be rejected
        with pytest.raises(ValidationError) as exc:
            RecipeService.check_circular_dependencies(str(recipe_b.id), str(recipe_a.id))
        assert "Circular recipe dependency detected" in str(exc.value)
