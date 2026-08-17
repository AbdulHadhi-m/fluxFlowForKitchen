from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.inventory.services import InventoryService
from apps.inventory.models import WasteRecord, StorageLocation


class InventoryAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.user = User.objects.create_user(
            email="store@ristorante.com",
            password="StorePassword123!",
            first_name="Luigi",
            last_name="Verdi",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.user,
            name="Ristorante Verdi",
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "store@ristorante.com", "password": "StorePassword123!"},
            content_type="application/json",
        )
        self.token = login_res.json()["data"]["access_token"]
        self.auth_headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.token}",
            "HTTP_X_RESTAURANT_ID": str(self.restaurant.id),
        }

        self.item = InventoryService.create_item(
            restaurant=self.restaurant,
            name="San Marzano Tomatoes",
            unit="kg",
            minimum_stock_level=Decimal("10.000"),
            cost_per_unit=Decimal("2.50"),
            initial_quantity=Decimal("50.000"),
            user=self.user,
        )

    def test_inventory_api_operations_flow(self):
        """Test listing items, intake, wastage, and movements history."""
        # 1. List
        list_res = self.client.get("/api/v1/inventory/items/", **self.auth_headers)
        self.assertEqual(list_res.status_code, 200)
        items_data = list_res.json().get("data", [])
        self.assertEqual(len(items_data), 1)

        # 2. Receive
        recv_url = f"/api/v1/inventory/items/{self.item.id}/receive/"
        recv_res = self.client.post(
            recv_url,
            {"quantity": "20.000", "unit": "kg", "unit_cost": "3.0000", "reason": "Fresh batch"},
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(recv_res.status_code, 200)
        self.assertEqual(recv_res.json()["item"]["current_quantity"], "70.000")

        # 3. Wastage
        waste_res = self.client.post(
            "/api/v1/inventory/waste/",
            {
                "item_id": str(self.item.id),
                "quantity": "5.000",
                "reason": WasteRecord.WasteReason.DAMAGED,
                "location": StorageLocation.KITCHEN,
                "notes": "Damaged cans",
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(waste_res.status_code, 201)

        # 4. Movement Ledger
        mov_res = self.client.get("/api/v1/inventory/movements/", **self.auth_headers)
        self.assertEqual(mov_res.status_code, 200)
        movs = mov_res.json().get("data", [])
        self.assertEqual(len(movs), 3)  # OPENING, PURCHASE, WASTAGE
