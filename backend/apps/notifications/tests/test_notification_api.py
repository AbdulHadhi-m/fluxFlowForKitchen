from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.notifications.services import NotificationService

class NotificationAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.user = User.objects.create_user(
            email="staff@ristorante.com",
            password="StaffPassword123!",
            first_name="Marco",
            last_name="Staff",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.user,
            name="Ristorante Roma",
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "staff@ristorante.com", "password": "StaffPassword123!"},
            content_type="application/json",
        )
        self.token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

        self.n1 = NotificationService.create_notification(
            restaurant=self.restaurant,
            recipient=self.user,
            notification_type="INVENTORY_LOW_STOCK",
            severity="WARNING",
            title="Low Stock Alert",
            message="Item below minimum threshold",
        )

    def test_notification_endpoints(self):
        """Test listing notifications, unread count, mark read, and mark all read."""
        # 1. Unread count -> 1
        count_res = self.client.get(reverse("notification_unread_count"), **self.auth_headers)
        self.assertEqual(count_res.status_code, 200)
        self.assertEqual(count_res.json()["data"]["count"], 1)

        # 2. List notifications
        list_res = self.client.get(reverse("notification_list"), **self.auth_headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(list_res.json()["data"][0]["title"], "Low Stock Alert")

        # 3. Mark single as read
        read_url = reverse("notification_mark_read", kwargs={"notification_id": self.n1.id})
        mark_res = self.client.post(read_url, **self.auth_headers)
        self.assertEqual(mark_res.status_code, 200)
        self.assertTrue(mark_res.json()["data"]["is_read"])

        # 4. Unread count -> 0
        count_res2 = self.client.get(reverse("notification_unread_count"), **self.auth_headers)
        self.assertEqual(count_res2.json()["data"]["count"], 0)
