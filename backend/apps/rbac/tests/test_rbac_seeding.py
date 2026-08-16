from django.test import TestCase
from django.core.management import call_command
from apps.rbac.models import Permission, Role

class RBACSeedingTests(TestCase):
    def test_seed_rbac_command_is_idempotent(self):
        """Verify python manage.py seed_rbac runs multiple times safely without duplicates."""
        # 1st run
        call_command("seed_rbac")
        perms_count_1 = Permission.objects.count()
        roles_count_1 = Role.objects.count()
        self.assertGreater(perms_count_1, 0)
        self.assertGreater(roles_count_1, 0)

        # 2nd run
        call_command("seed_rbac")
        perms_count_2 = Permission.objects.count()
        roles_count_2 = Role.objects.count()

        # Counts must remain strictly identical
        self.assertEqual(perms_count_1, perms_count_2)
        self.assertEqual(roles_count_1, roles_count_2)

        # Check system roles exist
        manager_role = Role.objects.get(code="MANAGER")
        self.assertTrue(manager_role.is_system)
        self.assertTrue(manager_role.permissions.filter(code="orders.create").exists())
        self.assertTrue(manager_role.permissions.filter(code="kitchen.bump").exists())
