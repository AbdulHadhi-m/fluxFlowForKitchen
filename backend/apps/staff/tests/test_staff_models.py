from django.test import TestCase
from django.db.utils import IntegrityError
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.rbac.models import Role, TenantMembership
from apps.rbac.services import RBACService
from apps.staff.models import StaffProfile

class StaffModelTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.restaurant = Restaurant.objects.create(name="Trattoria Roma")
        self.role_waiter = Role.objects.get(code="WAITER")
        self.role_cashier = Role.objects.get(code="CASHIER")

        self.user = User.objects.create_user(email="waiter@trattoria.com", password="Password123!")
        self.membership = TenantMembership.objects.create(
            user=self.user,
            tenant_id=self.restaurant.id,
            active_role=self.role_waiter,
        )

    def test_staff_profile_creation_and_role_sync(self):
        """Verify staff profile creation and primary/secondary role synchronization."""
        staff = StaffProfile.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            membership=self.membership,
            employee_id="EMP-001",
            first_name="Mario",
            last_name="Rossi",
            email="waiter@trattoria.com",
            primary_role=self.role_waiter,
        )
        staff.secondary_roles.add(self.role_cashier)
        staff.sync_membership_roles()

        self.assertEqual(staff.display_name, "Mario Rossi")
        self.assertEqual(staff.membership.active_role, self.role_waiter)
        self.assertEqual(staff.membership.assigned_roles.count(), 2)

    def test_unique_employee_id_per_restaurant(self):
        """Verify unique constraint on (restaurant, employee_id)."""
        StaffProfile.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            membership=self.membership,
            employee_id="EMP-001",
            email="waiter@trattoria.com",
            primary_role=self.role_waiter,
        )

        user2 = User.objects.create_user(email="waiter2@trattoria.com", password="Password123!")
        mem2 = TenantMembership.objects.create(
            user=user2,
            tenant_id=self.restaurant.id,
            active_role=self.role_waiter,
        )

        with self.assertRaises(IntegrityError):
            StaffProfile.objects.create(
                user=user2,
                restaurant=self.restaurant,
                membership=mem2,
                employee_id="EMP-001",  # Duplicate EMP-001 in same restaurant
                email="waiter2@trattoria.com",
                primary_role=self.role_waiter,
            )
