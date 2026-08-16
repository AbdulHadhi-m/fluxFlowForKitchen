from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.restaurants.services import RestaurantService
from apps.rbac.models import Role
from apps.rbac.services import RBACService
from apps.staff.models import StaffProfile
from apps.staff.services import StaffService

class StaffAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Admin user
        self.admin_user = User.objects.create_user(
            email="admin@ristorante.com",
            password="AdminPassword123!",
            first_name="Admin",
            last_name="Owner",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.admin_user,
            name="Ristorante Milano",
        )

        # Login as admin
        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "admin@ristorante.com", "password": "AdminPassword123!"},
            content_type="application/json",
        )
        self.admin_token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.admin_token}"}

    def test_create_and_list_staff_api(self):
        """Verify creating staff via API and listing with pagination."""
        create_res = self.client.post(
            reverse("staff_list_create"),
            {
                "email": "server1@ristorante.com",
                "first_name": "Giovanni",
                "last_name": "Ferrari",
                "phone": "+1-555-8888",
                "primary_role": "WAITER",
                "secondary_roles": ["CASHIER"],
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(create_res.status_code, 201)
        data = create_res.json()["data"]
        self.assertEqual(data["email"], "server1@ristorante.com")
        self.assertEqual(data["primary_role"]["code"], "WAITER")
        self.assertEqual(len(data["secondary_roles"]), 1)
        self.assertEqual(data["employee_id"], "EMP-001")

        # List staff
        list_res = self.client.get(
            reverse("staff_list_create"),
            **self.auth_headers,
        )
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(list_res.json()["meta"]["count"], 1)

    def test_update_staff_roles_api(self):
        """Verify updating staff primary and secondary roles."""
        staff = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="staff1@ristorante.com",
            primary_role_identifier="WAITER",
        )

        update_url = reverse("staff_detail_update", kwargs={"staff_id": staff.id})
        update_res = self.client.patch(
            update_url,
            {
                "primary_role": "MANAGER",
                "secondary_roles": ["CASHIER", "KITCHEN_STAFF"],
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(update_res.status_code, 200)
        data = update_res.json()["data"]
        self.assertEqual(data["primary_role"]["code"], "MANAGER")
        self.assertEqual(len(data["secondary_roles"]), 2)

    def test_disable_and_reactivate_staff_api(self):
        """Verify disabling and reactivating staff via API."""
        staff = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="staff2@ristorante.com",
            primary_role_identifier="CASHIER",
        )

        disable_url = reverse("staff_disable", kwargs={"staff_id": staff.id})
        disable_res = self.client.post(disable_url, **self.auth_headers)
        self.assertEqual(disable_res.status_code, 200)
        self.assertEqual(disable_res.json()["data"]["status"], "DISABLED")

        reactivate_url = reverse("staff_reactivate", kwargs={"staff_id": staff.id})
        reactivate_res = self.client.post(reactivate_url, **self.auth_headers)
        self.assertEqual(reactivate_res.status_code, 200)
        self.assertEqual(reactivate_res.json()["data"]["status"], "ACTIVE")
