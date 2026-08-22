from django.test import TestCase
from django.core.management import call_command
from apps.rbac.models import Role, Permission
from apps.rbac.services import RBACService

class SaasOwnerRestrictionsTests(TestCase):
    """
    Validates SaaS Owner role boundaries and operational restrictions:
    - Cannot participate in restaurant operations (kitchen.bump, tables.status.manage, etc.)
    - Cannot create customer orders (orders.create, orders.update, etc.)
    - Cannot process payments (billing.create, billing.payment.create, billing.refund, etc.)
    - Retains platform governance, security, observability, and support view permissions.
    """

    def setUp(self):
        call_command("seed_rbac")
        self.saas_role = Role.objects.get(code="SAAS_OWNER")
        self.saas_perm_codes = set(self.saas_role.permissions.values_list("code", flat=True))

    def test_saas_owner_cannot_create_or_modify_orders(self):
        """SaaS Owner must NOT possess customer order operational mutation permissions."""
        prohibited_order_perms = [
            "orders.create",
            "orders.update",
            "orders.cancel",
            "orders.complete",
            "orders.transfer",
        ]
        for perm in prohibited_order_perms:
            self.assertNotIn(
                perm,
                self.saas_perm_codes,
                f"SaaS Owner should NOT have '{perm}' operational permission."
            )

    def test_saas_owner_cannot_process_payments_or_billing_actions(self):
        """SaaS Owner must NOT possess billing, payment, discount, or refund mutation permissions."""
        prohibited_billing_perms = [
            "billing.create",
            "billing.payment.create",
            "billing.split",
            "billing.discount",
            "billing.refund",
            "billing.void",
            "finance.cash.manage",
            "finance.cash.approve_variance",
        ]
        for perm in prohibited_billing_perms:
            self.assertNotIn(
                perm,
                self.saas_perm_codes,
                f"SaaS Owner should NOT have '{perm}' financial processing permission."
            )

    def test_saas_owner_cannot_participate_in_kitchen_or_table_operations(self):
        """SaaS Owner must NOT possess live operational actions (kitchen bumping, table status)."""
        prohibited_operational_perms = [
            "kitchen.bump",
            "kitchen.recall",
            "kitchen.status.manage",
            "tables.status.manage",
            "hr.attendance.clock",
        ]
        for perm in prohibited_operational_perms:
            self.assertNotIn(
                perm,
                self.saas_perm_codes,
                f"SaaS Owner should NOT have '{perm}' operational permission."
            )

    def test_saas_owner_retains_platform_governance_and_support_visibility(self):
        """SaaS Owner maintains platform settings, security, monitoring, audit, and read-only support view."""
        required_platform_perms = [
            "settings.view",
            "settings.manage",
            "security.view",
            "security.manage",
            "monitoring.view",
            "audit.view",
            "reports.view",
            "orders.view",
            "billing.view",
            "kitchen.view",
        ]
        for perm in required_platform_perms:
            self.assertIn(
                perm,
                self.saas_perm_codes,
                f"SaaS Owner must maintain '{perm}' for platform governance and support."
            )
