from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.inventory.services import InventoryService

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
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

        self.item = InventoryService.create_item(
            restaurant=self.restaurant,
            name="San Marzano Tomatoes",
            unit="kg",
            minimum_stock_level=Decimal("10.000"),
            initial_quantity=Decimal("50.000"),
            user=self.user,
        )

    def test_inventory_api_operations_flow(self):
        """Test listing items, intake, wastage, and movements history."""
        # 1. List
        list_res = self.client.get(reverse("inventory_item_list_create"), **self.auth_headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.json()["data"]), 1)

        # 2. Receive
        recv_url = reverse("inventory_item_receive", kwargs={"item_id": self.item.id})
        recv_res = self.client.post(
            recv_url,
            {"quantity": "20.000", "unit": "kg", "reason": "Fresh batch"},
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(recv_res.status_code, 200)
        self.assertEqual(recv_res.json()["data"]["item"]["current_quantity"], "70.000")

        # 3. Wastage
        waste_url = reverse("inventory_item_waste", kwargs={"item_id": self.item.id})
        waste_res = self.client.post(
            waste_url,
            {"quantity": "5.000", "reason": "Damaged cans"},
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(waste_res.status_code, 200)
        self.assertEqual(waste_res.json()["data"]["item"]["current_quantity"], "65.000")

        # 4. Movement Ledger
        mov_res = self.client.get(reverse("stock_movement_list"), **self.auth_headers)
        self.assertEqual(mov_res.status_code, 200)
        self.assertEqual(len(mov_res.json()["data"]), 3) # OPENING, PURCHASE, WASTAGE
