import uuid
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.restaurants.services import RestaurantService
from apps.rbac.models import Role, TenantMembership
from apps.rbac.services import RBACService

class RestaurantTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Users
        self.admin_user = User.objects.create_user(email="admin@r1.com", password="Password123!")
        self.waiter_user = User.objects.create_user(email="waiter@r1.com", password="Password123!")
        self.external_user = User.objects.create_user(email="admin@r2.com", password="Password123!")

        # Restaurant 1
        self.r1, self.mem1 = RestaurantService.create_restaurant(
            user=self.admin_user,
            name="Restaurant One",
        )

        # Add waiter to Restaurant 1 with WAITER active role
        waiter_role = Role.objects.get(code="WAITER")
        self.waiter_mem = TenantMembership.objects.create(
            user=self.waiter_user,
            tenant_id=self.r1.id,
            active_role=waiter_role,
        )
        self.waiter_mem.assigned_roles.add(waiter_role)

        # Restaurant 2 (belongs to external_user)
        self.r2, self.mem2 = RestaurantService.create_restaurant(
            user=self.external_user,
            name="Restaurant Two",
        )

        # Waiter Login
        res_waiter_login = self.client.post(
            reverse("auth_login"),
            {"email": "waiter@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.waiter_token = res_waiter_login.json()["data"]["access_token"]

        # Admin Login
        res_admin_login = self.client.post(
            reverse("auth_login"),
            {"email": "admin@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.admin_token = res_admin_login.json()["data"]["access_token"]

    def test_waiter_denied_from_modifying_restaurant_settings(self):
        """Waiter role lacks 'settings.update' -> 403 Forbidden."""
        response = self.client.patch(
            reverse("restaurant_current"),
            {"name": "Hacked By Waiter"},
            HTTP_AUTHORIZATION=f"Bearer {self.waiter_token}",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.r1.refresh_from_db()
        self.assertEqual(self.r1.name, "Restaurant One")

    def test_tenant_isolation_between_restaurants(self):
        """Admin in Restaurant 1 only sees Restaurant 1 and cannot see Restaurant 2."""
        response = self.client.get(
            reverse("restaurant_current"),
            HTTP_AUTHORIZATION=f"Bearer {self.admin_token}",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["name"], "Restaurant One")
        self.assertNotEqual(response.json()["data"]["name"], "Restaurant Two")
