from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.inventory.models import InventoryItem, UnitOfMeasure
from apps.procurement.models import Supplier, PurchaseReturn, SupplierCredit
from apps.procurement.services import SupplierService, PurchaseReturnService


class PurchaseReturnsAndCreditsTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Romana")
        self.user = User.objects.create_user(email="chef@romana.com", password="Password123!")

        self.supplier = SupplierService.create_supplier(
            restaurant=self.restaurant,
            name="Roma Dairy Co.",
        )

        self.pecorino = InventoryItem.objects.create(
            restaurant=self.restaurant,
            name="Pecorino Romano DOP",
            sku="CH-099",
            unit=UnitOfMeasure.KG,
            current_quantity=Decimal("30.000"),
            minimum_stock_level=Decimal("10.000"),
            cost_per_unit=Decimal("20.00"),
            is_active=True,
        )

    def test_return_creation_approval_and_credit_issuance(self):
        # 1. Create Return Request for 10 kg Pecorino
        p_return = PurchaseReturnService.create_purchase_return(
            restaurant=self.restaurant,
            supplier=self.supplier,
            items_data=[{
                "inventory_item_id": str(self.pecorino.id),
                "quantity": "10.000",
                "unit": "kg",
                "unit_cost": "20.00",
                "notes": "Packaging punctured on arrival",
            }],
            reason=PurchaseReturn.ReturnReason.DAMAGED,
            requested_by=self.user,
        )
        self.assertEqual(p_return.status, PurchaseReturn.ReturnStatus.REQUESTED)
        self.assertEqual(p_return.total_credit_amount, Decimal("200.00"))

        # 2. Manager approves and dispatches return
        p_return = PurchaseReturnService.approve_and_dispatch_return(p_return, approver=self.user)
        self.assertEqual(p_return.status, PurchaseReturn.ReturnStatus.COMPLETED)

        # Inventory must be reduced by 10 kg (30 -> 20)
        self.pecorino.refresh_from_db()
        self.assertEqual(self.pecorino.current_quantity, Decimal("20.000"))

        # Supplier Credit note must be generated
        credits = SupplierCredit.objects.filter(related_return=p_return)
        self.assertEqual(credits.count(), 1)
        self.assertEqual(credits.first().amount, Decimal("200.00"))
        self.assertEqual(credits.first().status, SupplierCredit.CreditStatus.PENDING)
