from decimal import Decimal
import pytest
from django.utils import timezone
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.models import MenuItem, MenuCategory
from apps.orders.models import Order, OrderItem
from apps.inventory.models import InventoryItem, InventoryBatch, Recipe, RecipeItem
from apps.inventory.services import InventoryService, FEFOService


@pytest.mark.django_db
class TestBatchExpiryAndFEFO:
    @pytest.fixture
    def setup_data(self):
        RBACService.seed_system_roles_and_permissions()
        user = User.objects.create_user(email="fefo@kitchen.com", password="Password123!")
        rest, _ = RestaurantService.create_restaurant(user=user, name="FEFO Kitchen")

        cream = InventoryService.create_item(
            restaurant=rest,
            name="Heavy Cream",
            unit="l",
            cost_per_unit=Decimal("4.00"),
            initial_quantity=Decimal("0.000"),
            track_expiry=True,
            track_batch=True,
        )

        cat = MenuCategory.objects.create(restaurant=rest, name="Dessert")
        cake = MenuItem.objects.create(restaurant=rest, category=cat, name="Tiramisu", price=Decimal("8.00"))

        recipe = Recipe.objects.create(restaurant=rest, name="Tiramisu Recipe", menu_item=cake, version=1)
        RecipeItem.objects.create(recipe=recipe, inventory_item=cream, quantity=Decimal("200.000"), unit="ml")

        return {
            "restaurant": rest,
            "user": user,
            "item": cream,
            "menu_item": cake,
            "recipe": recipe,
        }

    def test_fefo_batch_allocation_priority(self, setup_data):
        rest = setup_data["restaurant"]
        cream = setup_data["item"]
        cake = setup_data["menu_item"]

        today = timezone.now().date()
        # Batch A: Expires in 3 days (10 L)
        InventoryService.receive_stock(
            restaurant=rest,
            item=cream,
            quantity=Decimal("10.000"),
            unit="l",
            unit_cost=Decimal("4.00"),
            batch_number="LOT-EARLY",
            expiry_date=today + timezone.timedelta(days=3),
        )

        # Batch B: Expires in 15 days (10 L)
        InventoryService.receive_stock(
            restaurant=rest,
            item=cream,
            quantity=Decimal("10.000"),
            unit="l",
            unit_cost=Decimal("4.20"),
            batch_number="LOT-LATER",
            expiry_date=today + timezone.timedelta(days=15),
        )

        cream.refresh_from_db()
        assert cream.current_quantity == Decimal("20.000")

        # FEFO allocation of 6 L must draw 6 L from LOT-EARLY first
        allocations = FEFOService.allocate_batches_for_consumption(cream, Decimal("6.000"))
        assert len(allocations) == 1
        assert allocations[0][0].batch_number == "LOT-EARLY"
        assert allocations[0][1] == Decimal("6.000")

        # Complete Order of 60 Tiramisu (60 * 200 ml = 12 L cream)
        # Should consume 10 L from LOT-EARLY (depleting it) and 2 L from LOT-LATER
        order = Order.objects.create(
            restaurant=rest, order_number="ORD-8001", subtotal=Decimal("480.00"), total=Decimal("480.00"), status=Order.OrderStatus.COMPLETED
        )
        OrderItem.objects.create(order=order, menu_item=cake, item_name_snapshot="Tiramisu", quantity=60, unit_price_snapshot=Decimal("8.00"), line_total=Decimal("480.00"))

        InventoryService.consume_stock_for_order(order)

        cream.refresh_from_db()
        assert cream.current_quantity == Decimal("8.000")

        batch_early = InventoryBatch.objects.get(batch_number="LOT-EARLY")
        batch_later = InventoryBatch.objects.get(batch_number="LOT-LATER")
        assert batch_early.current_quantity == Decimal("0.000")
        assert batch_early.batch_status == InventoryBatch.BatchStatus.DEPLETED
        assert batch_later.current_quantity == Decimal("8.000")
