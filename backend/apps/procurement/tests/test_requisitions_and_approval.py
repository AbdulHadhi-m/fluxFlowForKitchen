from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.inventory.models import InventoryItem, UnitOfMeasure, StorageLocation
from apps.procurement.models import PurchaseRequisition
from apps.procurement.services import PurchaseRequisitionService


class RequisitionAndApprovalTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Osteria Francescana")
        self.cook = User.objects.create_user(email="cook@osteria.com", password="Password123!")
        self.manager = User.objects.create_user(email="manager@osteria.com", password="Password123!")

        self.butter = InventoryItem.objects.create(
            restaurant=self.restaurant,
            name="Cultured Butter",
            sku="DA-002",
            unit=UnitOfMeasure.KG,
            current_quantity=Decimal("5.000"),
            minimum_stock_level=Decimal("15.000"),
            cost_per_unit=Decimal("12.00"),
            is_active=True,
        )

    def test_requisition_submission_and_approval_flow(self):
        # 1. Cook creates requisition draft
        req = PurchaseRequisitionService.create_requisition(
            restaurant=self.restaurant,
            requester=self.cook,
            items_data=[{
                "inventory_item_id": str(self.butter.id),
                "quantity": "20.000",
                "unit": "kg",
                "estimated_unit_cost": "12.00",
                "notes": "Low stock in pastry section",
            }],
            location=StorageLocation.KITCHEN,
            priority=PurchaseRequisition.RequisitionPriority.URGENT,
            reason="Weekend banquet prep",
        )
        self.assertEqual(req.status, PurchaseRequisition.RequisitionStatus.DRAFT)
        self.assertEqual(req.items.count(), 1)

        # 2. Cook submits requisition
        req = PurchaseRequisitionService.submit_requisition(req, actor=self.cook)
        self.assertEqual(req.status, PurchaseRequisition.RequisitionStatus.SUBMITTED)

        # 3. Manager approves requisition
        req = PurchaseRequisitionService.approve_requisition(req, approver=self.manager)
        self.assertEqual(req.status, PurchaseRequisition.RequisitionStatus.APPROVED)
        self.assertEqual(req.reviewed_by, self.manager)
        self.assertIsNotNone(req.reviewed_at)
