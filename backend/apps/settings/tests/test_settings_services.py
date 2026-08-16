from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.rbac.services import RBACService
from apps.restaurants.services import RestaurantService
from apps.settings.services import SettingsService, SettingsSelector
from apps.audit.models import AuditLog

class SettingsServiceTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.user = User.objects.create_user(email="manager@toscana.com", password="Password123!")
        self.restaurant, _ = RestaurantService.create_restaurant(user=self.user, name="Trattoria Toscana")

    def test_update_configuration_and_audit_logging(self):
        """Updating configuration applies updates and emits an audit record."""
        config = SettingsService.update_configuration(
            restaurant=self.restaurant,
            user=self.user,
            payload={
                "default_tax_rate": Decimal("8.50"),
                "invoice_prefix": "TOS",
            },
        )
        self.assertEqual(config.default_tax_rate, Decimal("8.50"))
        self.assertEqual(config.invoice_prefix, "TOS")

        # Verify Audit Log
        audit = AuditLog.objects.filter(restaurant=self.restaurant).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.action, "UPDATE")
        self.assertEqual(audit.after_data["invoice_prefix"], "TOS")

    def test_settings_selectors(self):
        """Selectors provide clean domain mappings."""
        billing_cfg = SettingsSelector.get_billing_settings(self.restaurant)
        self.assertEqual(billing_cfg["invoice_prefix"], "INV")

        kitchen_cfg = SettingsSelector.get_kitchen_settings(self.restaurant)
        self.assertEqual(kitchen_cfg["default_prep_time_minutes"], 15)
