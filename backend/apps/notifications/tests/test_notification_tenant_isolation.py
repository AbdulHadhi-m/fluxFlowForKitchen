from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.notifications.services import NotificationService

class NotificationTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.user1 = User.objects.create_user(email="staff1@r1.com", password="Password123!")
        self.r1, _ = RestaurantService.create_restaurant(user=self.user1, name="R1 Trattoria")
        self.n1 = NotificationService.create_notification(
            restaurant=self.r1,
            recipient=self.user1,
            notification_type="SYSTEM_ALERT",
            title="R1 Alert",
            message="R1 Msg",
        )

        # Restaurant 2
        self.user2 = User.objects.create_user(email="staff2@r2.com", password="Password123!")
        self.r2, _ = RestaurantService.create_restaurant(user=self.user2, name="R2 Pizzeria")
        self.n2 = NotificationService.create_notification(
            restaurant=self.r2,
            recipient=self.user2,
            notification_type="SYSTEM_ALERT",
            title="R2 Alert",
            message="R2 Msg",
        )

        # Login User 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "staff1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.token1 = login1.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token1}"}

    def test_user1_cannot_view_or_mark_read_user2_notifications(self):
        """User 1 only sees their notifications and gets 404 when attempting to mark User 2 notification read."""
        list_res = self.client.get(reverse("notification_list"), **self.auth1_headers)
        self.assertEqual(list_res.status_code, 200)
        titles = [n["title"] for n in list_res.json()["data"]]
        self.assertIn("R1 Alert", titles)
        self.assertNotIn("R2 Alert", titles)

        # Attempt to mark n2 read -> 404
        read_url = reverse("notification_mark_read", kwargs={"notification_id": self.n2.id})
        mark_res = self.client.post(read_url, **self.auth1_headers)
        self.assertEqual(mark_res.status_code, 404)
