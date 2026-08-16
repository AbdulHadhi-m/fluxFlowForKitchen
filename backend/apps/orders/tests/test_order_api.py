from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuCategory, MenuItem

class OrderAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.user = User.objects.create_user(
            email="waiter@bistro.com",
            password="WaiterPassword123!",
            first_name="Marco",
            last_name="Polo",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.user,
            name="Grand Bistro",
        )
        self.table = RestaurantTable.objects.create(restaurant=self.restaurant, name="T-12", capacity=4)
        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Mains")
        self.item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Grilled Salmon",
            price=Decimal("24.00"),
            is_available=True,
            is_active=True,
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "waiter@bistro.com", "password": "WaiterPassword123!"},
            content_type="application/json",
        )
        self.token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_order_creation_and_lifecycle_api(self):
        """Create order, view details, complete order via API."""
        # 1. Create Order
        res = self.client.post(
            reverse("order_list_create"),
            {
                "table_id": str(self.table.id),
                "notes": "Gluten allergy on table",
                "items": [
                    {
                        "menu_item_id": str(self.item.id),
                        "quantity": 2,
                        "notes": "Well done",
                    }
                ],
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()["data"]
        order_id = data["id"]
        self.assertEqual(data["total"], "48.00")
        self.assertEqual(data["status"], "PLACED")
        self.assertEqual(data["table_name"], "T-12")

        # 2. Get Order Detail
        detail_res = self.client.get(
            reverse("order_detail", kwargs={"order_id": order_id}),
            **self.auth_headers,
        )
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(len(detail_res.json()["data"]["items"]), 1)

        # 3. Complete Order
        complete_res = self.client.post(
            reverse("order_complete", kwargs={"order_id": order_id}),
            **self.auth_headers,
        )
        self.assertEqual(complete_res.status_code, 200)
        self.assertEqual(complete_res.json()["data"]["status"], "COMPLETED")
