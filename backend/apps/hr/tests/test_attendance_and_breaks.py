from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.staff.models import StaffProfile
from apps.staff.services import StaffService
from apps.rbac.services import RBACService
from apps.hr.models import (
    AttendanceSession,
    AttendanceStatus,
    AttendanceBreak,
    AttendanceCorrection,
)
from apps.hr.services import AttendanceService

class AttendanceAndBreaksTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.restaurant = Restaurant.objects.create(name="Bistro Paris", slug="bistro-paris")

        self.staff = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="waiter@bistro.com",
            first_name="Jean",
            last_name="Luc",
            primary_role_identifier="WAITER",
            password="Password123!",
            employee_id="EMP-002"
        )
        self.admin = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="admin@bistro.com",
            first_name="Store",
            last_name="Admin",
            primary_role_identifier="RESTAURANT_ADMIN",
            password="Password123!",
            employee_id="EMP-ADMIN"
        )

    def test_clock_in_and_clock_out_workflow(self):
        t0 = timezone.now() - timedelta(hours=9)
        session = AttendanceService.clock_in(
            restaurant=self.restaurant,
            staff_profile=self.staff,
            clock_in_time=t0
        )
        self.assertEqual(session.status, AttendanceStatus.PRESENT)
        self.assertIsNone(session.clock_out)

        # Duplicate clock-in rejected
        with self.assertRaises(ValidationError):
            AttendanceService.clock_in(restaurant=self.restaurant, staff_profile=self.staff)

        # Clock-out 9 hours later (8 regular, 1 overtime)
        t_out = t0 + timedelta(hours=9)
        closed_session = AttendanceService.clock_out(
            restaurant=self.restaurant,
            staff_profile=self.staff,
            clock_out_time=t_out
        )
        self.assertEqual(closed_session.worked_hours, Decimal("9.00"))
        self.assertEqual(closed_session.regular_hours, Decimal("8.00"))
        self.assertEqual(closed_session.overtime_hours, Decimal("1.00"))

    def test_break_deductions(self):
        t0 = timezone.now() - timedelta(hours=5)
        session = AttendanceService.clock_in(
            restaurant=self.restaurant,
            staff_profile=self.staff,
            clock_in_time=t0
        )

        brk = AttendanceService.start_break(session, break_type="LUNCH", is_paid=False)
        brk.start_time = t0 + timedelta(hours=2)
        brk.save()

        # End break 30 minutes later
        AttendanceService.end_break(brk)
        brk.end_time = brk.start_time + timedelta(minutes=30)
        brk.duration_minutes = 30
        brk.save()

        # Clock out at 5 hours total - 30 min break = 4.5 hours
        closed_session = AttendanceService.clock_out(
            restaurant=self.restaurant,
            staff_profile=self.staff,
            clock_out_time=t0 + timedelta(hours=5)
        )
        self.assertEqual(closed_session.worked_hours, Decimal("4.50"))
        self.assertEqual(closed_session.regular_hours, Decimal("4.50"))
        self.assertEqual(closed_session.overtime_hours, Decimal("0.00"))

    def test_attendance_correction_request_and_approval(self):
        t0 = timezone.now() - timedelta(hours=4)
        session = AttendanceService.clock_in(self.restaurant, self.staff, clock_in_time=t0)
        AttendanceService.clock_out(self.restaurant, self.staff, clock_out_time=t0 + timedelta(hours=4))

        # Request correction to 6 hours
        corr = AttendanceService.request_correction(
            attendance_session=session,
            requested_by=self.staff.user,
            requested_clock_in=t0,
            requested_clock_out=t0 + timedelta(hours=6),
            reason="Forgot to clock out on time due to rush hour"
        )
        self.assertEqual(corr.status, AttendanceCorrection.Status.SUBMITTED)

        # Manager approves
        AttendanceService.approve_correction(corr, reviewer=self.admin.user, approved=True)
        session.refresh_from_db()
        self.assertEqual(session.worked_hours, Decimal("6.00"))
        self.assertTrue(session.is_approved)
