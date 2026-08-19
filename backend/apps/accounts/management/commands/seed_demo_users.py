import uuid
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.rbac.models import Role, TenantMembership
from apps.rbac.services import RBACService
from apps.staff.models import StaffProfile

DEMO_PASSWORD = "password123"

DEMO_USERS = [
    {
        "role_code": "SAAS_OWNER",
        "email": "admin@fluxiflow.com",
        "first_name": "Alexander",
        "last_name": "Pierce",
        "employee_id": "EMP-001",
        "is_superuser": True,
        "is_staff": True,
        "title": "Platform Super Admin",
    },
    {
        "role_code": "RESTAURANT_ADMIN",
        "email": "owner@fluxiflow.com",
        "first_name": "Elena",
        "last_name": "Rostova",
        "employee_id": "EMP-002",
        "is_superuser": False,
        "is_staff": False,
        "title": "Restaurant Owner / Admin",
    },
    {
        "role_code": "MANAGER",
        "email": "manager@fluxiflow.com",
        "first_name": "Marcus",
        "last_name": "Vance",
        "employee_id": "EMP-003",
        "is_superuser": False,
        "is_staff": False,
        "title": "General Manager",
    },
    {
        "role_code": "CASHIER",
        "email": "cashier@fluxiflow.com",
        "first_name": "Chloe",
        "last_name": "Bennett",
        "employee_id": "EMP-004",
        "is_superuser": False,
        "is_staff": False,
        "title": "POS Head Cashier",
    },
    {
        "role_code": "WAITER",
        "email": "waiter@fluxiflow.com",
        "first_name": "Lucas",
        "last_name": "Silva",
        "employee_id": "EMP-005",
        "is_superuser": False,
        "is_staff": False,
        "title": "Lead Waitstaff / Server",
    },
    {
        "role_code": "KITCHEN_STAFF",
        "email": "chef@fluxiflow.com",
        "first_name": "Gordon",
        "last_name": "Ramsey",
        "employee_id": "EMP-006",
        "is_superuser": False,
        "is_staff": False,
        "title": "Executive Head Chef",
    },
    {
        "role_code": "DELIVERY_DRIVER",
        "email": "driver@fluxiflow.com",
        "first_name": "Diego",
        "last_name": "Morales",
        "employee_id": "EMP-007",
        "is_superuser": False,
        "is_staff": False,
        "title": "Delivery Courier",
    },
]


class Command(BaseCommand):
    help = "Seed demo users for all standard system roles with default credentials"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Ensuring RBAC permissions and system roles..."))
        RBACService.seed_system_roles_and_permissions()

        with transaction.atomic():
            # 1. Create or get default demo Restaurant
            restaurant, created = Restaurant.objects.get_or_create(
                slug="fluxi-bistro",
                defaults={
                    "name": "Fluxi Bistro & Kitchen",
                    "legal_name": "Fluxi Hospitality Group LLC",
                    "phone": "+1 (555) 234-5678",
                    "email": "contact@fluxibistro.com",
                    "address_line1": "742 Evergreen Terrace",
                    "city": "Springfield",
                    "state": "IL",
                    "postal_code": "62704",
                    "country": "United States",
                    "timezone": "America/New_York",
                    "currency": "INR",
                    "is_active": True,
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created demo restaurant: {restaurant.name} (ID: {restaurant.id})"))
            else:
                self.stdout.write(f"Using existing restaurant: {restaurant.name} (ID: {restaurant.id})")

            # 2. Seed Users, Memberships, and Staff Profiles
            for item in DEMO_USERS:
                role = Role.objects.filter(code=item["role_code"]).first()
                if not role:
                    self.stdout.write(self.style.ERROR(f"Role {item['role_code']} not found! Skipping."))
                    continue

                user = User.objects.filter(email=item["email"]).first()
                if not user:
                    if item["is_superuser"]:
                        user = User.objects.create_superuser(
                            email=item["email"],
                            password=DEMO_PASSWORD,
                            first_name=item["first_name"],
                            last_name=item["last_name"],
                        )
                    else:
                        user = User.objects.create_user(
                            email=item["email"],
                            password=DEMO_PASSWORD,
                            first_name=item["first_name"],
                            last_name=item["last_name"],
                            is_staff=item["is_staff"],
                            is_active=True,
                        )
                    self.stdout.write(self.style.SUCCESS(f"Created user: {user.email}"))
                else:
                    user.first_name = item["first_name"]
                    user.last_name = item["last_name"]
                    user.is_staff = item["is_staff"]
                    user.is_superuser = item["is_superuser"]
                    user.is_active = True
                    user.failed_login_attempts = 0
                    user.locked_until = None
                    user.set_password(DEMO_PASSWORD)
                    user.save()
                    self.stdout.write(f"Updated user password & status: {user.email}")

                # Tenant Membership
                membership, _ = TenantMembership.objects.get_or_create(
                    user=user,
                    tenant_id=restaurant.id,
                    defaults={
                        "active_role": role,
                        "is_active": True,
                    },
                )
                membership.active_role = role
                membership.is_active = True
                membership.assigned_roles.add(role)
                membership.save()

                # Staff Profile
                staff_profile, sp_created = StaffProfile.objects.get_or_create(
                    restaurant=restaurant,
                    employee_id=item["employee_id"],
                    defaults={
                        "user": user,
                        "membership": membership,
                        "first_name": item["first_name"],
                        "last_name": item["last_name"],
                        "email": item["email"],
                        "primary_role": role,
                        "status": StaffProfile.StaffStatus.ACTIVE,
                    },
                )
                if not sp_created:
                    staff_profile.user = user
                    staff_profile.membership = membership
                    staff_profile.primary_role = role
                    staff_profile.status = StaffProfile.StaffStatus.ACTIVE
                    staff_profile.save()

        self.stdout.write(self.style.SUCCESS(f"\nAll demo accounts seeded successfully with password '{DEMO_PASSWORD}'!"))
