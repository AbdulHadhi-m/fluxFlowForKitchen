from decimal import Decimal
import pytest
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.inventory.models import InventoryItem, StockCount, StockCountItem, InventoryTransfer
from apps.inventory.services import InventoryService, StockCountService, TransferService


@pytest.mark.django_db
class TestStockCountsAndTransfers:
    @pytest.fixture
    def setup_data(self):
        RBACService.seed_system_roles_and_permissions()
        manager = User.objects.create_user(email="manager@audit.com", password="Password123!")
        rest, _ = RestaurantService.create_restaurant(user=manager, name="Audit Kitchen")

        olive_oil = InventoryService.create_item(
            restaurant=rest, name="Olive Oil", unit="l", cost_per_unit=Decimal("12.00"), initial_quantity=Decimal("50.000")
        )
        return {"restaurant": rest, "manager": manager, "item": olive_oil}

    def test_stock_count_workflow_and_adjustment(self, setup_data):
        rest = setup_data["restaurant"]
        manager = setup_data["manager"]
        oil = setup_data["item"]

        # 1. Create Stock Count session
        count = StockCountService.create_stock_count(restaurant=rest, notes="Month-end audit", user=manager)
        assert count.status == StockCount.CountStatus.IN_PROGRESS
        assert count.items.count() == 1

        # 2. Record physical count (found 46 L instead of 50 L -> -4 L variance)
        StockCountService.update_count_items(
            count, [{"item_id": str(oil.id), "counted_quantity": "46.000", "notes": "Bottle leakage"}]
        )
        count_item = count.items.first()
        assert count_item.variance_quantity == Decimal("-4.000")
        assert count_item.variance_value == Decimal("-48.00")

        # 3. Submit
        StockCountService.submit_stock_count(count, user=manager)
        assert count.status == StockCount.CountStatus.SUBMITTED

        # 4. Manager approval: updates book stock to 46 L and posts adjustment movement
        StockCountService.approve_and_reconcile_count(count, manager_user=manager)
        assert count.status == StockCount.CountStatus.APPROVED

        oil.refresh_from_db()
        assert oil.current_quantity == Decimal("46.000")

    def test_inventory_transfer_workflow(self, setup_data):
        rest = setup_data["restaurant"]
        manager = setup_data["manager"]
        oil = setup_data["item"]

        # 1. Create Transfer Request (Main Store -> Kitchen: 10 L)
        transfer = TransferService.create_transfer(
            restaurant=rest,
            source_location="MAIN_STORE",
            destination_location="KITCHEN",
            items_data=[{"item_id": str(oil.id), "quantity": "10.000", "unit": "l"}],
            notes="Daily prep transfer",
            user=manager,
        )
        assert transfer.status == InventoryTransfer.TransferStatus.REQUESTED

        # 2. Approve & Dispatch
        TransferService.approve_and_dispatch(transfer, user=manager)
        assert transfer.status == InventoryTransfer.TransferStatus.IN_TRANSIT

        # 3. Receive & Complete
        TransferService.receive_and_complete(transfer, user=manager)
        assert transfer.status == InventoryTransfer.TransferStatus.RECEIVED
