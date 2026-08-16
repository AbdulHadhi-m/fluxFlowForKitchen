from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService

class SettingsAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.user = User.objects.create_user(
            email="admin@ristorante.com",
            password="AdminPassword123!",
            first_name="Marco",
            last_name="Admin",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.user,
            name="Ristorante Roma",
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "admin@ristorante.com", "password": "AdminPassword123!"},
            content_type="application/json",
        )
        self.token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_settings_api_lifecycle(self):
        """Test getting and patching restaurant profile, operational rules, and user preferences."""
        # 1. Get restaurant profile
        profile_res = self.client.get(reverse("settings_restaurant_profile"), **self.auth_headers)
        self.assertEqual(profile_res.status_code, 200)
        self.assertEqual(profile_res.json()["data"]["name"], "Ristorante Roma")

        # 2. Patch operational configuration
        op_patch_res = self.client.patch(
            reverse("settings_operational"),
            {"default_tax_rate": "7.50", "tax_name": "State Sales Tax"},
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(op_patch_res.status_code, 200)
        self.assertEqual(op_patch_res.json()["data"]["default_tax_rate"], "7.50")

        # 3. Patch user preferences
        pref_patch_res = self.client.patch(
            reverse("settings_user_preferences"),
            {"theme": "DARK", "time_format": "24H"},
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(pref_patch_res.status_code, 200)
        self.assertEqual(pref_patch_res.json()["data"]["time_format"], "24H")
