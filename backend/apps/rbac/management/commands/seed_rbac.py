"""Management command to seed standard RBAC system permissions and roles."""
from django.core.management.base import BaseCommand
from apps.rbac.services import RBACService

class Command(BaseCommand):
    help = "Idempotently seed system permissions, roles, and default role-permission mappings."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding system permissions and roles..."))
        perms_count, roles_count = RBACService.seed_system_roles_and_permissions()
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {perms_count} permissions and {roles_count} system roles."
            )
        )
