from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService

class OrderTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.user1 = User.objects.create_user(email="user1@r1.com", password="Password123!")
        self.r1, _ = RestaurantService.create_restaurant(user=self.user1, name="Ristorante Uno")
        self.cat1 = MenuCategory.objects.create(restaurant=self.r1, name="Pasta")
        self.item1 = MenuItem.objects.create(
            restaurant=self.r1,
            category=self.cat1,
            name="Lasagna",
            price=Decimal("18.00"),
            is_available=True,
            is_active=True,
        )
        self.order1 = OrderService.create_order(
            restaurant=self.r1,
            user=self.user1,
            items_data=[{"menu_item_id": str(self.item1.id), "quantity": 1}],
        )

        # Restaurant 2
        self.user2 = User.objects.create_user(email="user2@r2.com", password="Password123!")
        self.r2, _ = RestaurantService.create_restaurant(user=self.user2, name="Ristorante Due")
        self.cat2 = MenuCategory.objects.create(restaurant=self.r2, name="Pizza")
        self.item2 = MenuItem.objects.create(
            restaurant=self.r2,
            category=self.cat2,
            name="Diavola",
            price=Decimal("16.00"),
            is_available=True,
            is_active=True,
        )
        self.table2 = RestaurantTable.objects.create(restaurant=self.r2, name="T-99", capacity=2)

        # Login User 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "user1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.user1_token = login1.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.user1_token}"}

    def test_user_cannot_create_order_using_another_restaurants_menu_item(self):
        """User 1 attempting to order Restaurant 2's menu item is rejected with 400."""
        res = self.client.post(
            reverse("order_list_create"),
            {
                "items": [
                    {
                        "menu_item_id": str(self.item2.id),  # Belongs to Restaurant 2
                        "quantity": 1,
                    }
                ]
            },
            content_type="application/json",
            **self.auth1_headers,
        )
        self.assertEqual(res.status_code, 400)

    def test_user_cannot_create_order_using_another_restaurants_table(self):
        """User 1 attempting to link Restaurant 2's table is rejected with 400."""
        res = self.client.post(
            reverse("order_list_create"),
            {
                "table_id": str(self.table2.id),  # Belongs to Restaurant 2
                "items": [
                    {
                        "menu_item_id": str(self.item1.id),
                        "quantity": 1,
                    }
                ]
            },
            content_type="application/json",
            **self.auth1_headers,
        )
        self.assertEqual(res.status_code, 400)

    def test_user_cannot_view_or_cancel_another_restaurants_order(self):
        """User 2's order is hidden and unmodifiable from User 1."""
        order2 = OrderService.create_order(
            restaurant=self.r2,
            user=self.user2,
            items_data=[{"menu_item_id": str(self.item2.id), "quantity": 1}],
        )

        detail_url = reverse("order_detail", kwargs={"order_id": order2.id})
        res = self.client.get(detail_url, **self.auth1_headers)
        self.assertEqual(res.status_code, 404)

        cancel_url = reverse("order_cancel", kwargs={"order_id": order2.id})
        cancel_res = self.client.post(cancel_url, **self.auth1_headers)
        self.assertEqual(cancel_res.status_code, 404)
