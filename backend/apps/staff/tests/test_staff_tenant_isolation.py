from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.staff.services import StaffService

class StaffTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.admin1 = User.objects.create_user(email="admin1@r1.com", password="Password123!")
        self.r1, self.mem1 = RestaurantService.create_restaurant(user=self.admin1, name="Ristorante Uno")
        self.staff1 = StaffService.create_staff_member(
            restaurant=self.r1,
            email="waiter1@r1.com",
            password="Password123!",
            primary_role_identifier="WAITER",
        )

        # Restaurant 2
        self.admin2 = User.objects.create_user(email="admin2@r2.com", password="Password123!")
        self.r2, self.mem2 = RestaurantService.create_restaurant(user=self.admin2, name="Ristorante Due")
        self.staff2 = StaffService.create_staff_member(
            restaurant=self.r2,
            email="waiter2@r2.com",
            primary_role_identifier="WAITER",
        )

        # Admin 1 login
        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "admin1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.admin1_token = login_res.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.admin1_token}"}

    def test_admin_cannot_view_or_modify_staff_from_another_restaurant(self):
        """Admin 1 trying to access Staff 2 (from Restaurant 2) receives 404/403."""
        # Detail view
        url = reverse("staff_detail_update", kwargs={"staff_id": self.staff2.id})
        res = self.client.get(url, **self.auth1_headers)
        self.assertEqual(res.status_code, 404)

        # Modify attempt
        patch_res = self.client.patch(url, {"first_name": "Hacked"}, **self.auth1_headers, content_type="application/json")
        self.assertEqual(patch_res.status_code, 404)

        # Disable attempt
        disable_url = reverse("staff_disable", kwargs={"staff_id": self.staff2.id})
        disable_res = self.client.post(disable_url, **self.auth1_headers)
        self.assertEqual(disable_res.status_code, 404)

    def test_waiter_cannot_manage_staff(self):
        """Waiter attempting to list or create staff is rejected with 403 Forbidden."""
        # Waiter Login
        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "waiter1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        waiter_token = login_res.json()["data"]["access_token"]
        waiter_headers = {"HTTP_AUTHORIZATION": f"Bearer {waiter_token}"}

        res = self.client.get(reverse("staff_list_create"), **waiter_headers)
        self.assertEqual(res.status_code, 403)
