from datetime import time, date
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.staff.models import StaffProfile
from apps.staff.services import StaffService
from apps.rbac.services import RBACService
from apps.hr.models import (
    Shift,
    ShiftType,
    ShiftSchedule,
    ShiftSwapRequest,
)
from apps.hr.services import ShiftSchedulingService

class ShiftSchedulingAndSwapsTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.restaurant = Restaurant.objects.create(name="Bistro Paris", slug="bistro-paris")

        # Staff 1
        self.s1 = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="waiter1@bistro.com",
            first_name="Alice",
            last_name="Dupont",
            primary_role_identifier="WAITER",
            password="Password123!",
            employee_id="EMP-01"
        )

        # Staff 2
        self.s2 = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="waiter2@bistro.com",
            first_name="Bob",
            last_name="Martin",
            primary_role_identifier="WAITER",
            password="Password123!",
            employee_id="EMP-02"
        )

        # Admin
        self.admin = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="admin@bistro.com",
            first_name="Admin",
            last_name="Boss",
            primary_role_identifier="RESTAURANT_ADMIN",
            password="Password123!",
            employee_id="EMP-ADMIN"
        )

        self.morning_shift = Shift.objects.create(
            restaurant=self.restaurant,
            name="Morning Floor",
            shift_type=ShiftType.MORNING,
            start_time=time(8, 0),
            end_time=time(16, 0)
        )
        self.evening_shift = Shift.objects.create(
            restaurant=self.restaurant,
            name="Evening Floor",
            shift_type=ShiftType.EVENING,
            start_time=time(16, 0),
            end_time=time(23, 0)
        )

    def test_schedule_shift_and_overlap_prevention(self):
        target_date = date(2026, 9, 1)
        sched1 = ShiftSchedulingService.schedule_shift(
            restaurant=self.restaurant,
            staff_profile=self.s1,
            shift=self.morning_shift,
            shift_date=target_date
        )
        self.assertEqual(sched1.status, ShiftSchedule.Status.SCHEDULED)

        # Attempting overlapping shift on same date for same employee must raise ValidationError
        with self.assertRaises(ValidationError):
            ShiftSchedulingService.schedule_shift(
                restaurant=self.restaurant,
                staff_profile=self.s1,
                shift=self.morning_shift,
                shift_date=target_date
            )

    def test_shift_swap_request_and_approval(self):
        target_date = date(2026, 9, 2)
        sched_alice = ShiftSchedulingService.schedule_shift(
            restaurant=self.restaurant, staff_profile=self.s1, shift=self.morning_shift, shift_date=target_date
        )
        sched_bob = ShiftSchedulingService.schedule_shift(
            restaurant=self.restaurant, staff_profile=self.s2, shift=self.evening_shift, shift_date=target_date
        )

        # Alice requests swap with Bob
        swap = ShiftSchedulingService.request_swap(
            requester_shift=sched_alice,
            target_shift=sched_bob,
            requester=self.s1,
            target_employee=self.s2,
            notes="Doctor appointment in morning"
        )
        self.assertEqual(swap.status, ShiftSwapRequest.Status.PENDING_TARGET)

        # Manager approves swap
        approved = ShiftSchedulingService.approve_swap(swap, approver=self.admin.user)
        self.assertEqual(approved.status, ShiftSwapRequest.Status.APPROVED)

        sched_alice.refresh_from_db()
        sched_bob.refresh_from_db()
        # Alice now has evening, Bob now has morning
        self.assertEqual(sched_alice.staff_profile, self.s2)
        self.assertEqual(sched_bob.staff_profile, self.s1)
