from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.staff.services import StaffService
from apps.menu.services import MenuService

class MenuTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.admin1 = User.objects.create_user(email="admin1@r1.com", password="Password123!")
        self.r1, self.mem1 = RestaurantService.create_restaurant(user=self.admin1, name="Ristorante Uno")
        self.cat1 = MenuService.create_category(self.r1, name="Pizzas", display_order=1)
        self.item1 = MenuService.create_menu_item(
            restaurant=self.r1,
            category_id=self.cat1.id,
            name="Margherita",
            price=Decimal("12.00"),
        )

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
        self.cat2 = MenuService.create_category(self.r2, name="Pastas", display_order=1)
        self.item2 = MenuService.create_menu_item(
            restaurant=self.r2,
            category_id=self.cat2.id,
            name="Carbonara",
            price=Decimal("16.00"),
        )

        # Login Admin 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "admin1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.admin1_token = login1.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.admin1_token}"}

    def test_admin_cannot_view_or_modify_menu_from_another_restaurant(self):
        """Admin 1 trying to access Item 2 (from Restaurant 2) receives 404."""
        item2_url = reverse("menu_item_detail", kwargs={"item_id": self.item2.id})
        res = self.client.get(item2_url, **self.auth1_headers)
        self.assertEqual(res.status_code, 404)

        # Try to modify Item 2
        patch_res = self.client.patch(item2_url, {"name": "Hacked"}, content_type="application/json", **self.auth1_headers)
        self.assertEqual(patch_res.status_code, 404)

    def test_waiter_cannot_create_or_modify_menu_items(self):
        """Waiter attempting to create or edit menu items receives 403 Forbidden."""
        login_w = self.client.post(
            reverse("auth_login"),
            {"email": "waiter1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        w_token = login_w.json()["data"]["access_token"]
        w_headers = {"HTTP_AUTHORIZATION": f"Bearer {w_token}"}

        res = self.client.post(
            reverse("menu_item_list_create"),
            {
                "category_id": self.cat1.id,
                "name": "Unauthorized Item",
                "price": "10.00",
            },
            content_type="application/json",
            **w_headers,
        )
        self.assertEqual(res.status_code, 403)
