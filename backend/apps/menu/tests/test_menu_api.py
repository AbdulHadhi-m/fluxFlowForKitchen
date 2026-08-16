from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.services import MenuService

class MenuAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.admin = User.objects.create_user(
            email="chef@ristorante.com",
            password="ChefPassword123!",
            first_name="Gordon",
            last_name="Ramsay",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.admin,
            name="Hell's Kitchen",
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "chef@ristorante.com", "password": "ChefPassword123!"},
            content_type="application/json",
        )
        self.admin_token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.admin_token}"}

    def test_category_and_item_crud_api(self):
        """Create category, create menu item, search and list items via API."""
        # 1. Create Category
        cat_res = self.client.post(
            reverse("menu_category_list_create"),
            {"name": "Appetizers", "description": "Crispy starters", "display_order": 1},
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(cat_res.status_code, 201)
        cat_id = cat_res.json()["data"]["id"]

        # 2. Create Menu Item
        item_res = self.client.post(
            reverse("menu_item_list_create"),
            {
                "category_id": cat_id,
                "name": "Bruschetta al Pomodoro",
                "description": "Toasted bread with ripe tomatoes and fresh basil",
                "price": "9.50",
                "is_available": True,
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(item_res.status_code, 201)
        item_id = item_res.json()["data"]["id"]
        self.assertEqual(item_res.json()["data"]["price"], "9.50")

        # 3. Fast availability toggle
        avail_url = reverse("menu_item_availability", kwargs={"item_id": item_id})
        avail_res = self.client.patch(
            avail_url,
            {"is_available": False},
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(avail_res.status_code, 200)
        self.assertFalse(avail_res.json()["data"]["is_available"])

        # 4. Search and pagination
        list_res = self.client.get(
            reverse("menu_item_list_create") + "?search=Bruschetta",
            **self.auth_headers,
        )
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(list_res.json()["meta"]["count"], 1)
