from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.inventory.services import InventoryService
from apps.procurement.services import SupplierService, PurchaseOrderService

class ProcurementAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.user = User.objects.create_user(
            email="manager@ristorante.com",
            password="ManagerPassword123!",
            first_name="Marco",
            last_name="Manager",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.user,
            name="Ristorante Bellini",
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "manager@ristorante.com", "password": "ManagerPassword123!"},
            content_type="application/json",
        )
        self.token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

        self.supplier = SupplierService.create_supplier(
            restaurant=self.restaurant,
            name="Bologna Meat Supply",
            contact_person="Matteo",
        )

        self.beef = InventoryService.create_item(
            restaurant=self.restaurant,
            name="Ground Beef",
            unit="kg",
            initial_quantity=Decimal("20.000"),
            user=self.user,
        )

    def test_procurement_api_flow(self):
        """Test creating supplier, creating PO draft, submitting, approving, and receiving goods."""
        # 1. Create PO
        create_po_url = reverse("purchase_order_list_create")
        po_res = self.client.post(
            create_po_url,
            {
                "supplier_id": str(self.supplier.id),
                "items": [{
                    "inventory_item_id": str(self.beef.id),
                    "quantity_ordered": "30.000",
                    "unit_cost": "8.00",
                }],
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(po_res.status_code, 201)
        po_id = po_res.json()["data"]["id"]

        # 2. Submit PO
        submit_url = reverse("purchase_order_submit", kwargs={"po_id": po_id})
        sub_res = self.client.post(submit_url, **self.auth_headers)
        self.assertEqual(sub_res.status_code, 200)
        self.assertEqual(sub_res.json()["data"]["status"], "SUBMITTED")

        # 3. Approve PO
        approve_url = reverse("purchase_order_approve", kwargs={"po_id": po_id})
        app_res = self.client.post(approve_url, **self.auth_headers)
        self.assertEqual(app_res.status_code, 200)
        self.assertEqual(app_res.json()["data"]["status"], "APPROVED")

        # 4. Receive Goods
        po_item_id = sub_res.json()["data"]["items"][0]["id"]
        receive_url = reverse("purchase_order_receive", kwargs={"po_id": po_id})
        rec_res = self.client.post(
            receive_url,
            {
                "items": [{"purchase_order_item_id": po_item_id, "quantity": "30.000"}],
                "notes": "Delivered in refrigerated truck",
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(rec_res.status_code, 200)
        self.assertEqual(rec_res.json()["data"]["purchase_order"]["status"], "RECEIVED")

        self.beef.refresh_from_db()
        self.assertEqual(self.beef.current_quantity, Decimal("50.000")) # 20 + 30
