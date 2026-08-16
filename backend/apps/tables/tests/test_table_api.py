from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.tables.models import RestaurantTable
from apps.tables.services import TableService

class TableAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.admin = User.objects.create_user(
            email="manager@bistro.com",
            password="ManagerPassword123!",
            first_name="Jean",
            last_name="Luc",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.admin,
            name="Bistro Parisien",
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "manager@bistro.com", "password": "ManagerPassword123!"},
            content_type="application/json",
        )
        self.admin_token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.admin_token}"}

    def test_table_crud_and_status_api(self):
        """Create table, change status, search and list tables."""
        # 1. Create Table
        create_res = self.client.post(
            reverse("table_list_create"),
            {
                "name": "T-101",
                "capacity": 4,
                "section": "Main Hall",
                "display_order": 1,
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(create_res.status_code, 201)
        table_id = create_res.json()["data"]["id"]

        # 2. Update Status
        status_url = reverse("table_status_update", kwargs={"table_id": table_id})
        status_res = self.client.patch(
            status_url,
            {"status": "OCCUPIED"},
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.json()["data"]["status"], "OCCUPIED")

        # 3. List and search
        list_res = self.client.get(
            reverse("table_list_create") + "?search=T-101",
            **self.auth_headers,
        )
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(list_res.json()["meta"]["count"], 1)
