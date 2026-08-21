import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.models import MenuItem, MenuCategory
from apps.inventory.models import InventoryItem, Recipe, UnitOfMeasure
from apps.inventory.services import InventoryService

@pytest.mark.django_db
def test_create_recipe_via_api():
    RBACService.seed_system_roles_and_permissions()
    user = User.objects.create_user(email="chef@test.com", password="Password123!", is_superuser=True)
    rest, _ = RestaurantService.create_restaurant(user=user, name="Test Restaurant")
    cat = MenuCategory.objects.create(restaurant=rest, name="Starters")
    dish = MenuItem.objects.create(restaurant=rest, category=cat, name="Crispy Calamari Fritti", price=Decimal("450.00"))
    bun = InventoryService.create_item(
        restaurant=rest, name="Artisanal Brioche Buns", unit="piece", cost_per_unit=Decimal("25.00"), initial_quantity=Decimal("100.000")
    )
    beans = InventoryService.create_item(
        restaurant=rest, name="Single Origin Arabica Beans", unit="kg", cost_per_unit=Decimal("750.00"), initial_quantity=Decimal("50.000")
    )

    client = APIClient()
    client.force_authenticate(user=user)

    payload = {
        "name": "Crispy Calamari Fritti BOM",
        "recipe_type": "MENU_ITEM_RECIPE",
        "menu_item_id": str(dish.id),
        "output_quantity": "1.000",
        "output_unit": "piece",
        "yield_percentage": "100.00",
        "preparation_loss_pct": "5.00",
        "cooking_loss_pct": "1.00",
        "instructions": "",
        "notes": "",
        "ingredients": [
            {
                "inventory_item_id": str(bun.id),
                "quantity": 1,
                "unit": "piece",
                "preparation_notes": "",
            },
            {
                "inventory_item_id": str(beans.id),
                "quantity": 1,
                "unit": "kg",
                "preparation_notes": "",
            }
        ]
    }

    response = client.post("/api/v1/inventory/recipes/", payload, format="json")
    print("STATUS:", response.status_code)
    print("DATA:", response.data)
    assert response.status_code == 201
