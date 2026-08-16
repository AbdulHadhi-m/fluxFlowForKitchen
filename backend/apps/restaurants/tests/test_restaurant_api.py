import uuid
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService

class RestaurantAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.user = User.objects.create_user(
            email="owner@trattoria.com",
            password="SecurePassword123!",
            first_name="Luigi",
            last_name="Mario",
        )

        # Login to get JWT
        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "owner@trattoria.com", "password": "SecurePassword123!"},
            content_type="application/json",
        )
        self.access_token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.access_token}"}

    def test_create_restaurant_flow(self):
        """Verify restaurant creation sets up 7-day business hours and binds RESTAURANT_ADMIN membership."""
        response = self.client.post(
            reverse("restaurant_create"),
            {
                "name": "Luigi's Italian Kitchen",
                "phone": "+1-555-0199",
                "email": "contact@luigiskitchen.com",
                "timezone": "America/New_York",
                "currency": "USD",
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertEqual(data["name"], "Luigi's Italian Kitchen")
        self.assertEqual(len(data["business_hours"]), 7)

        # Verify current restaurant retrieval
        current_res = self.client.get(
            reverse("restaurant_current"),
            **self.auth_headers,
        )
        self.assertEqual(current_res.status_code, 200)
        self.assertEqual(current_res.json()["data"]["name"], "Luigi's Italian Kitchen")

    def test_update_restaurant_profile(self):
        """Verify updating restaurant profile fields."""
        restaurant, membership = RestaurantService.create_restaurant(
            user=self.user,
            name="Original Name",
        )

        update_res = self.client.patch(
            reverse("restaurant_current"),
            {"name": "Updated Restaurant Name", "phone": "+1-555-9988"},
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["data"]["name"], "Updated Restaurant Name")
        self.assertEqual(update_res.json()["data"]["phone"], "+1-555-9988")

    def test_update_business_hours_schedule(self):
        """Verify batch updating 7-day operating hours."""
        restaurant, membership = RestaurantService.create_restaurant(
            user=self.user,
            name="Pizzeria Roma",
        )

        updated_hours_payload = [
            {"day_of_week": 0, "opening_time": "10:00:00", "closing_time": "23:00:00", "is_closed": False},
            {"day_of_week": 1, "opening_time": "10:00:00", "closing_time": "23:00:00", "is_closed": False},
            {"day_of_week": 2, "opening_time": "10:00:00", "closing_time": "23:00:00", "is_closed": False},
            {"day_of_week": 3, "opening_time": "10:00:00", "closing_time": "23:00:00", "is_closed": False},
            {"day_of_week": 4, "opening_time": "10:00:00", "closing_time": "02:00:00", "is_closed": False, "is_overnight": True},
            {"day_of_week": 5, "opening_time": "10:00:00", "closing_time": "02:00:00", "is_closed": False, "is_overnight": True},
            {"day_of_week": 6, "is_closed": True},
        ]

        hours_res = self.client.put(
            reverse("restaurant_hours"),
            updated_hours_payload,
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(hours_res.status_code, 200)
        self.assertEqual(len(hours_res.json()["data"]), 7)
