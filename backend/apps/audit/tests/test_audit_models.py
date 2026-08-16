from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.audit.models import AuditLog

class AuditModelTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Toscana")
        self.user = User.objects.create_user(email="chef@toscana.com", password="Password123!")

    def test_audit_log_immutability(self):
        """Audit records cannot be modified or deleted once created."""
        log = AuditLog.objects.create(
            restaurant=self.restaurant,
            actor_user=self.user,
            actor_email=self.user.email,
            action="CREATE",
            entity_type="MENU_ITEM",
            entity_id="item-001",
            description="Created Margherita Pizza",
        )

        # Attempt to update description
        log.description = "Altered description"
        with self.assertRaises(ValidationError):
            log.save()

        # Attempt to delete record
        with self.assertRaises(ValidationError):
            log.delete()
