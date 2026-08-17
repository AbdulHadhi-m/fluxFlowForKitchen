from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.inventory.models import InventoryItem, UnitOfMeasure
from apps.procurement.models import Supplier, SupplierType, PaymentTerms, SupplierContact, SupplierItem, SupplierPriceHistory
from apps.procurement.services import SupplierService


class SupplierManagementTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Bellini")
        self.user = User.objects.create_user(email="chef@bellini.com", password="Password123!")

        self.flour = InventoryItem.objects.create(
            restaurant=self.restaurant,
            name="Tipo 00 Pizza Flour",
            sku="FL-001",
            unit=UnitOfMeasure.KG,
            current_quantity=Decimal("100.000"),
            minimum_stock_level=Decimal("20.000"),
            cost_per_unit=Decimal("1.80"),
            is_active=True,
        )

        self.supplier = SupplierService.create_supplier(
            restaurant=self.restaurant,
            name="Napoli Millers SpA",
            supplier_type=SupplierType.PRIMARY_WHOLESALER,
            contact_person="Gennaro",
            email="gennaro@napolimillers.it",
            phone="+39 081 293819",
            payment_terms=PaymentTerms.NET_30,
            currency="EUR",
            lead_time_days=3,
            minimum_order_value=Decimal("250.00"),
            created_by=self.user,
        )

    def test_supplier_contacts(self):
        c1 = SupplierService.add_contact(
            supplier=self.supplier,
            name="Enzo",
            role="Warehouse Dispatcher",
            phone="+39 081 293820",
            is_primary=True,
        )
        self.assertTrue(c1.is_primary)

        c2 = SupplierService.add_contact(
            supplier=self.supplier,
            name="Sofia",
            role="Accounts Receivable",
            phone="+39 081 293821",
            is_primary=True,
        )
        c1.refresh_from_db()
        self.assertFalse(c1.is_primary)
        self.assertTrue(c2.is_primary)

    def test_supplier_item_mapping_and_price_history(self):
        # 1. Map Flour to Supplier @ 1.75 / kg
        s_item = SupplierService.upsert_supplier_item(
            supplier=self.supplier,
            inventory_item=self.flour,
            unit_cost=Decimal("1.75"),
            supplier_sku="NAP-00-BAG25",
            purchase_unit=UnitOfMeasure.KG,
            minimum_order_quantity=Decimal("50.000"),
            pack_size=Decimal("25.000"),
            lead_time_days=3,
            is_preferred=True,
            changed_by=self.user,
        )
        self.assertEqual(s_item.unit_cost, Decimal("1.75"))
        self.assertTrue(s_item.is_preferred)

        # 2. Price update to 1.90 / kg triggers price history entry
        s_item2 = SupplierService.upsert_supplier_item(
            supplier=self.supplier,
            inventory_item=self.flour,
            unit_cost=Decimal("1.90"),
            supplier_sku="NAP-00-BAG25",
            purchase_unit=UnitOfMeasure.KG,
            minimum_order_quantity=Decimal("50.000"),
            pack_size=Decimal("25.000"),
            lead_time_days=3,
            is_preferred=True,
            changed_by=self.user,
        )
        self.assertEqual(s_item2.unit_cost, Decimal("1.90"))

        history = SupplierPriceHistory.objects.filter(supplier=self.supplier, inventory_item=self.flour)
        self.assertEqual(history.count(), 1)
        self.assertEqual(history.first().previous_price, Decimal("1.75"))
        self.assertEqual(history.first().new_price, Decimal("1.90"))

    def test_supplier_performance_scorecard(self):
        scorecard = SupplierService.calculate_supplier_scorecard(self.supplier)
        self.assertEqual(scorecard["supplier_name"], "Napoli Millers SpA")
        self.assertEqual(scorecard["total_orders"], 0)
        self.assertEqual(scorecard["fill_rate_percentage"], "100.00")
