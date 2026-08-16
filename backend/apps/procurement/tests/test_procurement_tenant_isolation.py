from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.inventory.services import InventoryService
from apps.procurement.services import SupplierService, PurchaseOrderService

class ProcurementTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.user1 = User.objects.create_user(email="mgr1@r1.com", password="Password123!")
        self.r1, _ = RestaurantService.create_restaurant(user=self.user1, name="R1 Trattoria")
        self.supplier1 = SupplierService.create_supplier(restaurant=self.r1, name="Supplier 1")
        self.item1 = InventoryService.create_item(restaurant=self.r1, name="Item 1", initial_quantity=Decimal("10.000"))
        self.po1 = PurchaseOrderService.create_purchase_order(
            restaurant=self.r1,
            supplier=self.supplier1,
            items_data=[{"inventory_item_id": str(self.item1.id), "quantity_ordered": "10.000"}],
            user=self.user1,
        )

        # Restaurant 2
        self.user2 = User.objects.create_user(email="mgr2@r2.com", password="Password123!")
        self.r2, _ = RestaurantService.create_restaurant(user=self.user2, name="R2 Pizzeria")
        self.supplier2 = SupplierService.create_supplier(restaurant=self.r2, name="Supplier 2")
        self.item2 = InventoryService.create_item(restaurant=self.r2, name="Item 2", initial_quantity=Decimal("15.000"))
        self.po2 = PurchaseOrderService.create_purchase_order(
            restaurant=self.r2,
            supplier=self.supplier2,
            items_data=[{"inventory_item_id": str(self.item2.id), "quantity_ordered": "15.000"}],
            user=self.user2,
        )

        # Login User 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "mgr1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.token1 = login1.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token1}"}

    def test_manager_cannot_view_or_mutate_other_restaurants_supplier_or_po(self):
        """User 1 cannot access Supplier 2 or Purchase Order 2."""
        # 1. Supplier 2 detail -> 404
        sup_url = reverse("supplier_detail", kwargs={"supplier_id": self.supplier2.id})
        sup_res = self.client.get(sup_url, **self.auth1_headers)
        self.assertEqual(sup_res.status_code, 404)

        # 2. PO 2 detail -> 404
        po_url = reverse("purchase_order_detail", kwargs={"po_id": self.po2.id})
        po_res = self.client.get(po_url, **self.auth1_headers)
        self.assertEqual(po_res.status_code, 404)

        # 3. Submit PO 2 -> 404
        sub_url = reverse("purchase_order_submit", kwargs={"po_id": self.po2.id})
        sub_res = self.client.post(sub_url, **self.auth1_headers)
        self.assertEqual(sub_res.status_code, 404)
