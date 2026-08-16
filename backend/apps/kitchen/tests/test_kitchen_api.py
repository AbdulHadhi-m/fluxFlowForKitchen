from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService
from apps.kitchen.models import KitchenTicket

class KitchenAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.user = User.objects.create_user(
            email="chef@bistro.com",
            password="ChefPassword123!",
            first_name="Gordon",
            last_name="Ramsay",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.user,
            name="Hell's Kitchen",
        )
        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Main")
        self.item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Beef Wellington",
            price=Decimal("45.00"),
            is_available=True,
            is_active=True,
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "chef@bistro.com", "password": "ChefPassword123!"},
            content_type="application/json",
        )
        self.token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

        self.order = OrderService.create_order(
            restaurant=self.restaurant,
            user=self.user,
            items_data=[{"menu_item_id": str(self.item.id), "quantity": 1}],
        )
        self.ticket = self.order.kitchen_ticket

    def test_kitchen_queue_and_status_advance_api(self):
        """List queue and advance ticket status via REST."""
        # 1. List active queue
        list_res = self.client.get(reverse("kitchen_ticket_list"), **self.auth_headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.json()["data"]), 1)
        self.assertEqual(list_res.json()["data"][0]["status"], "NEW")

        # 2. Start
        start_url = reverse("kitchen_ticket_start", kwargs={"ticket_id": self.ticket.id})
        start_res = self.client.post(start_url, **self.auth_headers)
        self.assertEqual(start_res.status_code, 200)
        self.assertEqual(start_res.json()["data"]["status"], "PREPARING")

        # 3. Ready
        ready_url = reverse("kitchen_ticket_ready", kwargs={"ticket_id": self.ticket.id})
        ready_res = self.client.post(ready_url, **self.auth_headers)
        self.assertEqual(ready_res.status_code, 200)
        self.assertEqual(ready_res.json()["data"]["status"], "READY")

        # 4. Complete
        complete_url = reverse("kitchen_ticket_complete", kwargs={"ticket_id": self.ticket.id})
        complete_res = self.client.post(complete_url, **self.auth_headers)
        self.assertEqual(complete_res.status_code, 200)
        self.assertEqual(complete_res.json()["data"]["status"], "COMPLETED")
