from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from apps.restaurants.models import Restaurant
from apps.staff.models import StaffProfile
from apps.staff.services import StaffService
from apps.rbac.services import RBACService
from apps.hr.models import (
    Department,
    Position,
    EmploymentStatus,
)
from apps.hr.services import EmployeeLifecycleService

class EmployeeLifecycleTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.restaurant = Restaurant.objects.create(name="Bistro Paris", slug="bistro-paris")

        self.staff_profile = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="chef@bistro.com",
            first_name="Gordon",
            last_name="Ramsay",
            primary_role_identifier="KITCHEN_STAFF",
            password="Password123!",
            employee_id="EMP-001"
        )

    def test_department_and_position_creation(self):
        dept = Department.objects.create(
            restaurant=self.restaurant,
            name="Kitchen Operations",
            code="KITCHEN",
            manager=self.staff_profile
        )
        pos = Position.objects.create(
            restaurant=self.restaurant,
            department=dept,
            title="Head Chef",
            code="HEAD_CHEF",
            min_pay=Decimal("30.00"),
            max_pay=Decimal("50.00")
        )
        self.assertEqual(dept.name, "Kitchen Operations")
        self.assertEqual(pos.title, "Head Chef")
        self.assertEqual(pos.department, dept)

    def test_employee_hr_detail_and_onboarding(self):
        dept = Department.objects.create(restaurant=self.restaurant, name="Kitchen", code="KITCHEN")
        pos = Position.objects.create(restaurant=self.restaurant, department=dept, title="Chef", code="CHEF")

        detail = EmployeeLifecycleService.get_or_create_hr_detail(self.staff_profile)
        detail.department = dept
        detail.position = pos
        detail.save()

        self.assertEqual(detail.employment_status, EmploymentStatus.ACTIVE)
        self.assertEqual(detail.department, dept)
        self.assertEqual(detail.position, pos)
        self.assertTrue(detail.onboarding_checklist.get("profile_completed"))

    def test_employee_offboarding_disables_account(self):
        detail = EmployeeLifecycleService.offboard_employee(
            staff_profile=self.staff_profile,
            termination_date=timezone.now().date(),
            reason="Relocation to another city"
        )
        self.assertEqual(detail.employment_status, EmploymentStatus.TERMINATED)
        self.staff_profile.refresh_from_db()
        self.assertEqual(self.staff_profile.status, StaffProfile.StaffStatus.DISABLED)
