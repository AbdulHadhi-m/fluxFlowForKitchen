from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.settings.services import SettingsService

class SettingsTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.user1 = User.objects.create_user(email="admin1@r1.com", password="Password123!")
        self.r1, _ = RestaurantService.create_restaurant(user=self.user1, name="R1 Trattoria")
        SettingsService.update_configuration(
            restaurant=self.r1,
            user=self.user1,
            payload={"invoice_prefix": "R1-INV"},
        )

        # Restaurant 2
        self.user2 = User.objects.create_user(email="admin2@r2.com", password="Password123!")
        self.r2, _ = RestaurantService.create_restaurant(user=self.user2, name="R2 Pizzeria")
        SettingsService.update_configuration(
            restaurant=self.r2,
            user=self.user2,
            payload={"invoice_prefix": "R2-INV"},
        )

        # Login User 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "admin1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.token1 = login1.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token1}"}

    def test_user1_only_accesses_and_updates_restaurant1_settings(self):
        """User 1 operational settings fetch only returns Restaurant 1's config."""
        op_res = self.client.get(reverse("settings_operational"), **self.auth1_headers)
        self.assertEqual(op_res.status_code, 200)
        self.assertEqual(op_res.json()["data"]["invoice_prefix"], "R1-INV")
