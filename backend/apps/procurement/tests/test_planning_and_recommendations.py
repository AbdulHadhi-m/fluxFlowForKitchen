from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.inventory.models import InventoryItem, UnitOfMeasure
from apps.procurement.models import Supplier, SupplierItem
from apps.procurement.services import SupplierService, ProcurementPlanningService


class PlanningAndRecommendationsTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Ristorante Venezia")
        self.user = User.objects.create_user(email="buyer@venezia.com", password="Password123!")

        self.olive_oil = InventoryItem.objects.create(
            restaurant=self.restaurant,
            name="Extra Virgin Olive Oil",
            sku="OIL-001",
            unit=UnitOfMeasure.L,
            current_quantity=Decimal("4.000"),
            minimum_stock_level=Decimal("10.000"),
            par_level=Decimal("25.000"),
            cost_per_unit=Decimal("9.00"),
            is_active=True,
        )

        self.supplier = SupplierService.create_supplier(
            restaurant=self.restaurant,
            name="Tuscan Olive Groves",
        )

        # Supplier has MOQ of 10L and Pack Size of 5L (e.g. 5L cans)
        SupplierService.upsert_supplier_item(
            supplier=self.supplier,
            inventory_item=self.olive_oil,
            unit_cost=Decimal("8.50"),
            purchase_unit=UnitOfMeasure.L,
            minimum_order_quantity=Decimal("10.000"),
            pack_size=Decimal("5.000"),
            lead_time_days=2,
            is_preferred=True,
        )

    def test_reorder_recommendation_rounds_to_pack_size(self):
        # Current stock: 4L, Par: 25L -> Deficit is 21L
        # Pack size is 5L -> 21L rounds up to 25L (5 cans of 5L)
        recommendations = ProcurementPlanningService.generate_purchase_recommendations(self.restaurant)
        self.assertEqual(len(recommendations), 1)

        rec = recommendations[0]
        self.assertEqual(rec["item_name"], "Extra Virgin Olive Oil")
        self.assertEqual(rec["suggested_quantity"], "25.000")
        self.assertEqual(rec["preferred_supplier_name"], "Tuscan Olive Groves")
        self.assertEqual(rec["unit_cost"], "8.50")
        self.assertEqual(rec["estimated_total_cost"], "212.50")
