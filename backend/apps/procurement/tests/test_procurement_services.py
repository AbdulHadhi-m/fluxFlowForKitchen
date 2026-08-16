from decimal import Decimal
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.inventory.services import InventoryService
from apps.procurement.models import Supplier, PurchaseOrder
from apps.procurement.services import SupplierService, PurchaseOrderService

class ProcurementServiceTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Toscana")
        self.user = User.objects.create_user(email="procurement@toscana.com", password="Password123!")

        self.supplier = SupplierService.create_supplier(
            restaurant=self.restaurant,
            name="Euro Foods Distributor",
            contact_person="Claudio",
            email="claudio@eurofoods.com",
            phone="+39 02 882910",
        )

        self.rice = InventoryService.create_item(
            restaurant=self.restaurant,
            name="Carnaroli Rice",
            unit="kg",
            minimum_stock_level=Decimal("10.000"),
            initial_quantity=Decimal("50.000"),
            user=self.user,
        )

    def test_po_lifecycle_and_receiving_flow(self):
        """Draft -> Submitted -> Approved -> Partial Receive -> Full Receive."""
        # 1. Create Draft PO for 100 kg rice @ $4.50/kg
        po = PurchaseOrderService.create_purchase_order(
            restaurant=self.restaurant,
            supplier=self.supplier,
            items_data=[{
                "inventory_item_id": str(self.rice.id),
                "quantity_ordered": "100.000",
                "unit_cost": "4.50",
            }],
            user=self.user,
        )
        self.assertEqual(po.status, "DRAFT")
        self.assertEqual(po.subtotal, Decimal("450.00"))

        # 2. Submit
        po = PurchaseOrderService.submit_purchase_order(po)
        self.assertEqual(po.status, "SUBMITTED")

        # 3. Approve
        po = PurchaseOrderService.approve_purchase_order(po, user=self.user)
        self.assertEqual(po.status, "APPROVED")
        self.assertIsNotNone(po.approved_at)

        # 4. Partial Receive 60 kg
        item_id = po.items.first().id
        receipt1 = PurchaseOrderService.receive_purchase_order(
            restaurant=self.restaurant,
            po=po,
            items_received_data=[{"purchase_order_item_id": str(item_id), "quantity": "60.000"}],
            idempotency_key="receipt-batch-001",
            user=self.user,
        )
        po.refresh_from_db()
        self.assertEqual(po.status, "PARTIALLY_RECEIVED")
        self.rice.refresh_from_db()
        self.assertEqual(self.rice.current_quantity, Decimal("110.000")) # 50 + 60

        # Idempotency check: submitting same batch key returns existing receipt without duplicating stock
        receipt1_retry = PurchaseOrderService.receive_purchase_order(
            restaurant=self.restaurant,
            po=po,
            items_received_data=[{"purchase_order_item_id": str(item_id), "quantity": "60.000"}],
            idempotency_key="receipt-batch-001",
            user=self.user,
        )
        self.assertEqual(receipt1_retry.id, receipt1.id)
        self.rice.refresh_from_db()
        self.assertEqual(self.rice.current_quantity, Decimal("110.000"))

        # 5. Over-receiving check: attempting to receive 50kg (remaining is 40kg) must raise ValidationError
        with self.assertRaises(ValidationError):
            PurchaseOrderService.receive_purchase_order(
                restaurant=self.restaurant,
                po=po,
                items_received_data=[{"purchase_order_item_id": str(item_id), "quantity": "50.000"}],
                idempotency_key="receipt-batch-002",
                user=self.user,
            )

        # 6. Final Receive remaining 40 kg
        PurchaseOrderService.receive_purchase_order(
            restaurant=self.restaurant,
            po=po,
            items_received_data=[{"purchase_order_item_id": str(item_id), "quantity": "40.000"}],
            idempotency_key="receipt-batch-003",
            user=self.user,
        )
        po.refresh_from_db()
        self.assertEqual(po.status, "RECEIVED")
        self.rice.refresh_from_db()
        self.assertEqual(self.rice.current_quantity, Decimal("150.000")) # 110 + 40
