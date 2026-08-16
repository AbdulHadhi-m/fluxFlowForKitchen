import uuid
from django.test import TestCase
from django.db.utils import IntegrityError
from apps.accounts.models import User
from apps.rbac.models import Permission, Role, TenantMembership

class RBACModelTests(TestCase):
    def test_permission_creation_and_uniqueness(self):
        """Verify unique constraint on permission codes."""
        p1 = Permission.objects.create(resource="orders", action="create")
        self.assertEqual(p1.code, "orders.create")

        # Duplicate code must fail
        with self.assertRaises(IntegrityError):
            Permission.objects.create(resource="orders", action="create")

    def test_role_creation_and_permission_assignment(self):
        """Verify role creation and M2M permission assignment."""
        p_view = Permission.objects.create(resource="menu", action="view")
        p_update = Permission.objects.create(resource="menu", action="update")

        role = Role.objects.create(name="Menu Editor", code="MENU_EDITOR")
        role.permissions.set([p_view, p_update])

        self.assertEqual(role.permissions.count(), 2)
        self.assertIn(p_view, role.permissions.all())

    def test_tenant_membership_effective_permissions(self):
        """Verify effective permissions resolve strictly to active_role."""
        user = User.objects.create_user(email="staff@fluxiflow.com", password="Password123!")
        tenant_id = uuid.uuid4()

        p_orders = Permission.objects.create(resource="orders", action="create")
        p_tables = Permission.objects.create(resource="tables", action="view")
        p_reports = Permission.objects.create(resource="reports", action="view")

        role_waiter = Role.objects.create(name="Waiter", code="WAITER")
        role_waiter.permissions.set([p_orders, p_tables])

        role_manager = Role.objects.create(name="Manager", code="MANAGER")
        role_manager.permissions.set([p_orders, p_tables, p_reports])

        membership = TenantMembership.objects.create(
            user=user,
            tenant_id=tenant_id,
            active_role=role_waiter,
        )
        membership.assigned_roles.set([role_waiter, role_manager])

        # Active role = WAITER (should only have orders.create and tables.view)
        perms = membership.get_effective_permissions()
        self.assertEqual(perms, {"orders.create", "tables.view"})
        self.assertNotIn("reports.view", perms)

        # Switch active role to MANAGER
        membership.active_role = role_manager
        membership.save()
        manager_perms = membership.get_effective_permissions()
        self.assertEqual(manager_perms, {"orders.create", "tables.view", "reports.view"})
