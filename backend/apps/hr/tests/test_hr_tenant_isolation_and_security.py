from decimal import Decimal
from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from apps.restaurants.models import Restaurant
from apps.staff.models import StaffProfile
from apps.staff.services import StaffService
from apps.rbac.services import RBACService
from apps.hr.models import (
    Department,
    PayrollPeriod,
    PayrollRun,
    PayrollItem,
)

class HRTenantIsolationAndSecurityTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.r1 = Restaurant.objects.create(name="R1 Bistro", slug="r1-bistro")
        self.s1 = StaffService.create_staff_member(
            restaurant=self.r1,
            email="owner1@r1.com",
            first_name="Admin",
            last_name="One",
            primary_role_identifier="RESTAURANT_ADMIN",
            password="Password123!",
            employee_id="EMP-R1"
        )

        # Restaurant 2
        self.r2 = Restaurant.objects.create(name="R2 Grill", slug="r2-grill")
        self.s2 = StaffService.create_staff_member(
            restaurant=self.r2,
            email="owner2@r2.com",
            first_name="Admin",
            last_name="Two",
            primary_role_identifier="RESTAURANT_ADMIN",
            password="Password123!",
            employee_id="EMP-R2"
        )

        self.d1 = Department.objects.create(restaurant=self.r1, name="Kitchen R1", code="KITCHEN_R1")
        self.d2 = Department.objects.create(restaurant=self.r2, name="Kitchen R2", code="KITCHEN_R2")

        self.client = APIClient()

    def _extract_items(self, response_data):
        if isinstance(response_data, dict):
            if "data" in response_data and isinstance(response_data["data"], list):
                return response_data["data"]
            if "results" in response_data and isinstance(response_data["results"], list):
                return response_data["results"]
        if isinstance(response_data, list):
            return response_data
        return []

    def test_tenant_isolation_departments(self):
        self.client.force_authenticate(user=self.s1.user)
        res = self.client.get("/api/v1/hr/departments/", HTTP_X_RESTAURANT_ID=str(self.r1.id))
        self.assertEqual(res.status_code, 200)
        items = self._extract_items(res.data)
        names = [d["name"] for d in items]
        self.assertIn("Kitchen R1", names)
        self.assertNotIn("Kitchen R2", names)

    def test_payslip_privacy_between_employees(self):
        # Waiter in R1
        sw = StaffService.create_staff_member(
            restaurant=self.r1,
            email="waiter@r1.com",
            first_name="Sam",
            last_name="Waiter",
            primary_role_identifier="WAITER",
            password="Password123!",
            employee_id="WTR-01"
        )

        period = PayrollPeriod.objects.create(
            restaurant=self.r1, name="Sep 2026", frequency="MONTHLY",
            start_date=date(2026, 9, 1), end_date=date(2026, 9, 30)
        )
        run = PayrollRun.objects.create(restaurant=self.r1, payroll_period=period, run_number="PR-01")
        item_admin = PayrollItem.objects.create(
            payroll_run=run, staff_profile=self.s1, restaurant=self.r1,
            base_pay=Decimal("5000.00"), gross_pay=Decimal("5000.00"), net_pay=Decimal("4500.00")
        )
        item_waiter = PayrollItem.objects.create(
            payroll_run=run, staff_profile=sw, restaurant=self.r1,
            base_pay=Decimal("2000.00"), gross_pay=Decimal("2000.00"), net_pay=Decimal("1800.00")
        )

        # Waiter queries payslips -> should only see item_waiter, NOT item_admin
        self.client.force_authenticate(user=sw.user)
        res = self.client.get("/api/v1/hr/payslips/", HTTP_X_RESTAURANT_ID=str(self.r1.id))
        self.assertEqual(res.status_code, 200)
        items = self._extract_items(res.data)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["id"], str(item_waiter.id))
