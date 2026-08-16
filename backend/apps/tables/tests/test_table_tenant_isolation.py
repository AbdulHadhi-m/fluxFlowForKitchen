from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.staff.services import StaffService
from apps.tables.services import TableService

class TableTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.admin1 = User.objects.create_user(email="admin1@r1.com", password="Password123!")
        self.r1, self.mem1 = RestaurantService.create_restaurant(user=self.admin1, name="Ristorante Uno")
        self.table1 = TableService.create_table(restaurant=self.r1, name="T01", capacity=4)

        # Waiter in Restaurant 1
        self.waiter1 = StaffService.create_staff_member(
            restaurant=self.r1,
            email="waiter1@r1.com",
            password="Password123!",
            primary_role_identifier="WAITER",
        )

        # Restaurant 2
        self.admin2 = User.objects.create_user(email="admin2@r2.com", password="Password123!")
        self.r2, self.mem2 = RestaurantService.create_restaurant(user=self.admin2, name="Ristorante Due")
        self.table2 = TableService.create_table(restaurant=self.r2, name="T01", capacity=2)

        # Login Admin 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "admin1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.admin1_token = login1.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.admin1_token}"}

    def test_admin_cannot_access_or_modify_table_from_another_restaurant(self):
        """Admin 1 accessing Table 2 (from Restaurant 2) receives 404."""
        table2_url = reverse("table_detail_update", kwargs={"table_id": self.table2.id})
        res = self.client.get(table2_url, **self.auth1_headers)
        self.assertEqual(res.status_code, 404)

        # Try to modify
        patch_res = self.client.patch(table2_url, {"name": "Hacked"}, content_type="application/json", **self.auth1_headers)
        self.assertEqual(patch_res.status_code, 404)

    def test_waiter_cannot_create_or_modify_tables(self):
        """Waiter attempting to create a table receives 403 Forbidden."""
        login_w = self.client.post(
            reverse("auth_login"),
            {"email": "waiter1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        w_token = login_w.json()["data"]["access_token"]
        w_headers = {"HTTP_AUTHORIZATION": f"Bearer {w_token}"}

        res = self.client.post(
            reverse("table_list_create"),
            {"name": "T99", "capacity": 4},
            content_type="application/json",
            **w_headers,
        )
        self.assertEqual(res.status_code, 403)
