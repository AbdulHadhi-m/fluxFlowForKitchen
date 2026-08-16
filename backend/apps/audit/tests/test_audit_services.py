from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.rbac.services import RBACService
from apps.restaurants.services import RestaurantService
from apps.audit.services import AuditLogService

class AuditServiceTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.user = User.objects.create_user(email="manager@toscana.com", password="Password123!")
        self.restaurant, _ = RestaurantService.create_restaurant(user=self.user, name="Trattoria Toscana")

    def test_audit_recording_and_sanitization(self):
        """AuditLogService sanitizes passwords and tokens and persists snapshot data."""
        log = AuditLogService.record(
            action="UPDATE",
            entity_type="USER",
            entity_id=str(self.user.id),
            description="User profile and password updated",
            restaurant=self.restaurant,
            actor_user=self.user,
            actor_role="MANAGER",
            before_data={"email": "manager@toscana.com", "password": "SecretPassword123!", "price": Decimal("15.50")},
            after_data={"email": "manager@toscana.com", "password": "NewSecretPassword456!", "price": Decimal("20.00")},
        )

        self.assertEqual(log.action, "UPDATE")
        self.assertEqual(log.actor_email, self.user.email)
        # Verify passwords are redacted
        self.assertEqual(log.before_data["password"], "[REDACTED]")
        self.assertEqual(log.after_data["password"], "[REDACTED]")
        # Verify Decimal is serialized
        self.assertEqual(log.before_data["price"], "15.50")
