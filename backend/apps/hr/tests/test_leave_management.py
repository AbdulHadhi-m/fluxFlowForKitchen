from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.staff.models import StaffProfile
from apps.staff.services import StaffService
from apps.rbac.services import RBACService
from apps.hr.models import (
    LeaveType,
    LeaveAllocation,
    LeaveRequest,
)
from apps.hr.services import LeaveManagementService

class LeaveManagementTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.restaurant = Restaurant.objects.create(name="Bistro Paris", slug="bistro-paris")

        self.staff = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="chef@bistro.com",
            first_name="Gordon",
            last_name="Ramsay",
            primary_role_identifier="KITCHEN_STAFF",
            password="Password123!",
            employee_id="EMP-10"
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

        self.annual_leave = LeaveType.objects.create(
            restaurant=self.restaurant,
            name="Paid Annual Vacation",
            code=LeaveType.Code.ANNUAL,
            default_days_per_year=Decimal("15.0")
        )

    def test_request_and_approve_leave(self):
        req = LeaveManagementService.request_leave(
            restaurant=self.restaurant,
            staff_profile=self.staff,
            leave_type=self.annual_leave,
            start_date=date(2026, 9, 10),
            end_date=date(2026, 9, 12),
            reason="Family vacation"
        )
        self.assertEqual(req.status, LeaveRequest.Status.SUBMITTED)
        self.assertEqual(req.days_count, Decimal("3.0"))

        allocation = LeaveAllocation.objects.get(staff_profile=self.staff, leave_type=self.annual_leave)
        self.assertEqual(allocation.pending_days, Decimal("3.0"))
        self.assertEqual(allocation.used_days, Decimal("0.0"))

        # Overlapping request fails
        with self.assertRaises(ValidationError):
            LeaveManagementService.request_leave(
                restaurant=self.restaurant,
                staff_profile=self.staff,
                leave_type=self.annual_leave,
                start_date=date(2026, 9, 11),
                end_date=date(2026, 9, 14),
                reason="Overlap"
            )

        # Manager approves
        approved = LeaveManagementService.approve_leave(req, approver=self.admin.user)
        self.assertEqual(approved.status, LeaveRequest.Status.APPROVED)

        allocation.refresh_from_db()
        self.assertEqual(allocation.pending_days, Decimal("0.0"))
        self.assertEqual(allocation.used_days, Decimal("3.0"))
        self.assertEqual(allocation.remaining_days, Decimal("12.0"))
