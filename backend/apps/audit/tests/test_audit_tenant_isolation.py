from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.audit.services import AuditLogService

class AuditTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.user1 = User.objects.create_user(email="admin1@r1.com", password="Password123!")
        self.r1, _ = RestaurantService.create_restaurant(user=self.user1, name="R1 Trattoria")
        self.log1 = AuditLogService.record(
            action="CREATE",
            entity_type="ORDER",
            entity_id="ord-r1",
            description="R1 Order Created",
            restaurant=self.r1,
            actor_user=self.user1,
        )

        # Restaurant 2
        self.user2 = User.objects.create_user(email="admin2@r2.com", password="Password123!")
        self.r2, _ = RestaurantService.create_restaurant(user=self.user2, name="R2 Pizzeria")
        self.log2 = AuditLogService.record(
            action="CREATE",
            entity_type="ORDER",
            entity_id="ord-r2",
            description="R2 Order Created",
            restaurant=self.r2,
            actor_user=self.user2,
        )

        # Login User 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "admin1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.token1 = login1.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token1}"}

    def test_user1_cannot_view_user2_audit_logs(self):
        """User 1's audit log list never contains Restaurant 2 events and log2 returns 404."""
        list_res = self.client.get(reverse("audit_log_list"), **self.auth1_headers)
        self.assertEqual(list_res.status_code, 200)
        descriptions = [l["description"] for l in list_res.json()["data"]]
        self.assertIn("R1 Order Created", descriptions)
        self.assertNotIn("R2 Order Created", descriptions)

        # Attempt to access log2 directly -> 404
        detail_url = reverse("audit_log_detail", kwargs={"log_id": self.log2.id})
        detail_res = self.client.get(detail_url, **self.auth1_headers)
        self.assertEqual(detail_res.status_code, 404)
