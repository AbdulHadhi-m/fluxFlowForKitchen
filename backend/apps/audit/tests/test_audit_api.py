from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.audit.services import AuditLogService

class AuditAPITests(TestCase):
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
            name="Ristorante Bellini",
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "admin@ristorante.com", "password": "AdminPassword123!"},
            content_type="application/json",
        )
        self.token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

        self.log = AuditLogService.record(
            action="CREATE",
            entity_type="MENU_ITEM",
            entity_id="item-001",
            description="Created Spaghetti Carbonara",
            restaurant=self.restaurant,
            actor_user=self.user,
        )

    def test_audit_list_detail_and_export(self):
        """Test listing logs, detail query, and CSV export endpoint."""
        # 1. List logs
        list_res = self.client.get(reverse("audit_log_list"), **self.auth_headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(list_res.json()["data"][0]["description"], "Created Spaghetti Carbonara")

        # 2. Detail log
        detail_url = reverse("audit_log_detail", kwargs={"log_id": self.log.id})
        detail_res = self.client.get(detail_url, **self.auth_headers)
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.json()["data"]["action"], "CREATE")

        # 3. CSV Export
        export_res = self.client.get(reverse("audit_log_export"), **self.auth_headers)
        self.assertEqual(export_res.status_code, 200)
        self.assertEqual(export_res["Content-Type"], "text/csv")
