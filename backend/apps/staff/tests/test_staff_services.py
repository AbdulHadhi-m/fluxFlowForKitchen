from django.test import TestCase
from apps.accounts.models import User, UserSession
from apps.restaurants.models import Restaurant
from apps.rbac.services import RBACService
from apps.staff.models import StaffProfile
from apps.staff.services import StaffService

class StaffServiceTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.restaurant = Restaurant.objects.create(name="Trattoria Roma")

    def test_create_staff_member_service(self):
        """Verify atomic creation of User, Membership, and StaffProfile."""
        staff = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="chef@trattoria.com",
            first_name="Marco",
            last_name="Pierre",
            phone="+1-555-1234",
            primary_role_identifier="KITCHEN_STAFF",
            secondary_role_identifiers=["WAITER"],
        )
        self.assertEqual(staff.employee_id, "EMP-001")
        self.assertEqual(staff.primary_role.code, "KITCHEN_STAFF")
        self.assertEqual(staff.secondary_roles.count(), 1)
        self.assertEqual(staff.membership.active_role.code, "KITCHEN_STAFF")

    def test_disable_staff_invalidates_sessions(self):
        """Verify disabling staff member revokes active user sessions."""
        staff = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="waiter@trattoria.com",
            primary_role_identifier="WAITER",
        )
        # Create active session for staff
        session = UserSession.objects.create(
            user=staff.user,
            refresh_token_hash="sample_hash",
            expires_at="2030-01-01T00:00:00Z",
            is_revoked=False,
        )

        StaffService.disable_staff_member(staff)
        staff.refresh_from_db()
        session.refresh_from_db()

        self.assertEqual(staff.status, StaffProfile.StaffStatus.DISABLED)
        self.assertFalse(staff.is_active)
        self.assertFalse(staff.membership.is_active)
        self.assertTrue(session.is_revoked)
