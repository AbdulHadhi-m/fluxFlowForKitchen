from decimal import Decimal
from django.test import TestCase
from apps.restaurants.models import Restaurant
from apps.procurement.models import Supplier, PurchaseOrder

class ProcurementModelTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Toscana")

    def test_supplier_and_po_creation(self):
        """Supplier and PO creation store valid properties and unique codes."""
        supplier = Supplier.objects.create(
            restaurant=self.restaurant,
            supplier_code="SUP-000001",
            name="Tuscan Farm Foods",
            contact_person="Marco Rossi",
            phone="+39 055 123456",
        )
        self.assertEqual(str(supplier), "Tuscan Farm Foods (SUP-000001) - Trattoria Toscana")

        po = PurchaseOrder.objects.create(
            restaurant=self.restaurant,
            supplier=supplier,
            po_number="PO-000001",
            status="DRAFT",
        )
        self.assertEqual(str(po), "PO-000001 (Tuscan Farm Foods) - DRAFT")
