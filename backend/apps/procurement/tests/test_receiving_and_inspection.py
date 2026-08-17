from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.inventory.models import InventoryItem, UnitOfMeasure, StorageLocation
from apps.procurement.models import Supplier, PurchaseOrder, PurchaseReceiptItem
from apps.procurement.services import SupplierService, PurchaseOrderService


class ReceivingAndInspectionTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Ristorante Cracco")
        self.user = User.objects.create_user(email="storekeeper@cracco.com", password="Password123!")

        self.supplier = SupplierService.create_supplier(
            restaurant=self.restaurant,
            name="Milano Fresh Meats",
        )

        self.steak = InventoryItem.objects.create(
            restaurant=self.restaurant,
            name="Ribeye Steak",
            sku="MT-009",
            unit=UnitOfMeasure.KG,
            current_quantity=Decimal("10.000"),
            minimum_stock_level=Decimal("20.000"),
            cost_per_unit=Decimal("25.00"),
            weighted_average_cost=Decimal("25.00"),
            track_expiry=True,
            track_batch=True,
            is_active=True,
        )

    def test_inspection_receiving_with_damaged_goods(self):
        # PO for 50 kg Ribeye
        po = PurchaseOrderService.create_purchase_order(
            restaurant=self.restaurant,
            supplier=self.supplier,
            items_data=[{
                "inventory_item_id": str(self.steak.id),
                "quantity_ordered": "50.000",
                "unit_cost": "26.00",
            }],
            created_by=self.user,
        )
        po = PurchaseOrderService.approve_purchase_order(po, approver=self.user)

        # Receive 50 kg: 45 kg accepted, 5 kg rejected due to broken seal / damage
        po_item = po.items.first()
        receipt = PurchaseOrderService.receive_goods(
            purchase_order=po,
            received_items=[{
                "purchase_order_item_id": str(po_item.id),
                "quantity_received": "50.000",
                "quantity_accepted": "45.000",
                "quantity_rejected": "5.000",
                "rejection_reason": PurchaseReceiptItem.RejectionReason.DAMAGED,
                "batch_number": "BATCH-RIB-902",
                "expiry_date": timezone.now().date() + timezone.timedelta(days=14),
                "unit_cost_actual": "26.00",
            }],
            received_by=self.user,
            invoice_number="INV-MIL-8891",
        )

        self.assertEqual(receipt.items.count(), 1)
        r_item = receipt.items.first()
        self.assertEqual(r_item.quantity_accepted, Decimal("45.000"))
        self.assertEqual(r_item.quantity_rejected, Decimal("5.000"))
        self.assertEqual(r_item.rejection_reason, PurchaseReceiptItem.RejectionReason.DAMAGED)

        # Inventory must only increase by 45 kg accepted (10 + 45 = 55)
        self.steak.refresh_from_db()
        self.assertEqual(self.steak.current_quantity, Decimal("55.000"))
