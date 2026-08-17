from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.inventory.services import InventoryService


class InventoryTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.user1 = User.objects.create_user(email="store1@r1.com", password="Password123!")
        self.r1, _ = RestaurantService.create_restaurant(user=self.user1, name="R1 Trattoria")
        self.item1 = InventoryService.create_item(restaurant=self.r1, name="Mozzarella", unit="kg", initial_quantity=Decimal("10.000"))

        # Restaurant 2
        self.user2 = User.objects.create_user(email="store2@r2.com", password="Password123!")
        self.r2, _ = RestaurantService.create_restaurant(user=self.user2, name="R2 Pizzeria")
        self.item2 = InventoryService.create_item(restaurant=self.r2, name="Gorgonzola", unit="kg", initial_quantity=Decimal("15.000"))

        # Login User 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "store1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.token1 = login1.json()["data"]["access_token"]
        self.auth1_headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.token1}",
            "HTTP_X_RESTAURANT_ID": str(self.r1.id),
        }

    def test_store_staff_cannot_view_or_adjust_another_restaurants_item(self):
        """User 1 cannot view or adjust Item 2 belonging to Restaurant 2."""
        # Detail Item 2 -> 404
        detail_res = self.client.get(f"/api/v1/inventory/items/{self.item2.id}/", **self.auth1_headers)
        self.assertEqual(detail_res.status_code, 404)

        # Adjust Item 2 -> 404
        adj_res = self.client.post(
            f"/api/v1/inventory/items/{self.item2.id}/adjust/",
            {"delta_quantity": "5.000", "reason": "Test"},
            content_type="application/json",
            **self.auth1_headers,
        )
        self.assertEqual(adj_res.status_code, 404)
