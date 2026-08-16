from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService

class KitchenTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.user1 = User.objects.create_user(email="chef1@r1.com", password="Password123!")
        self.r1, _ = RestaurantService.create_restaurant(user=self.user1, name="R1 Bistro")
        self.cat1 = MenuCategory.objects.create(restaurant=self.r1, name="Mains")
        self.item1 = MenuItem.objects.create(restaurant=self.r1, category=self.cat1, name="Steak", price=Decimal("30.00"), is_available=True, is_active=True)
        self.order1 = OrderService.create_order(
            restaurant=self.r1,
            user=self.user1,
            items_data=[{"menu_item_id": str(self.item1.id), "quantity": 1}],
        )
        self.ticket1 = self.order1.kitchen_ticket

        # Restaurant 2
        self.user2 = User.objects.create_user(email="chef2@r2.com", password="Password123!")
        self.r2, _ = RestaurantService.create_restaurant(user=self.user2, name="R2 Grill")
        self.cat2 = MenuCategory.objects.create(restaurant=self.r2, name="Mains")
        self.item2 = MenuItem.objects.create(restaurant=self.r2, category=self.cat2, name="Burger", price=Decimal("15.00"), is_available=True, is_active=True)
        self.order2 = OrderService.create_order(
            restaurant=self.r2,
            user=self.user2,
            items_data=[{"menu_item_id": str(self.item2.id), "quantity": 1}],
        )
        self.ticket2 = self.order2.kitchen_ticket

        # Login User 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "chef1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.token1 = login1.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token1}"}

    def test_chef_cannot_view_or_advance_another_restaurants_ticket(self):
        """Chef 1 cannot see or start Ticket 2 belonging to Restaurant 2."""
        # List only contains Ticket 1
        list_res = self.client.get(reverse("kitchen_ticket_list"), **self.auth1_headers)
        self.assertEqual(list_res.status_code, 200)
        ticket_ids = [t["id"] for t in list_res.json()["data"]]
        self.assertIn(str(self.ticket1.id), ticket_ids)
        self.assertNotIn(str(self.ticket2.id), ticket_ids)

        # Attempt to start Ticket 2 -> 404
        start_url = reverse("kitchen_ticket_start", kwargs={"ticket_id": self.ticket2.id})
        start_res = self.client.post(start_url, **self.auth1_headers)
        self.assertEqual(start_res.status_code, 404)
