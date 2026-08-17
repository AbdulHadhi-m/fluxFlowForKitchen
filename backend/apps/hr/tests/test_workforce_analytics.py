from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from apps.restaurants.models import Restaurant
from apps.staff.services import StaffService
from apps.rbac.services import RBACService
from apps.finance.services import ChartOfAccountsService
from apps.hr.models import (
    Compensation,
    PayType,
    AttendanceSession,
    PayrollPeriod,
    PayrollRun,
)
from apps.hr.services import PayrollService, WorkforceAnalyticsService

class WorkforceAnalyticsTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.restaurant = Restaurant.objects.create(name="Bistro Paris", slug="bistro-paris")
        ChartOfAccountsService.seed_default_chart_of_accounts(self.restaurant)

        self.staff1 = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="chef@bistro.com",
            first_name="Gordon",
            last_name="Ramsay",
            primary_role_identifier="KITCHEN_STAFF",
            password="Password123!",
            employee_id="EMP-01"
        )
        self.admin = StaffService.create_staff_member(
            restaurant=self.restaurant,
            email="admin@bistro.com",
            first_name="Admin",
            last_name="Boss",
            primary_role_identifier="RESTAURANT_ADMIN",
            password="Password123!",
            employee_id="EMP-ADMIN"
        )

        Compensation.objects.create(
            staff_profile=self.staff1,
            restaurant=self.restaurant,
            pay_type=PayType.HOURLY,
            base_rate=Decimal("20.00"),
            overtime_rate_multiplier=Decimal("1.50")
        )

        AttendanceSession.objects.create(
            restaurant=self.restaurant,
            staff_profile=self.staff1,
            date=date(2026, 9, 5),
            clock_in=timezone.now() - timedelta(hours=10),
            clock_out=timezone.now(),
            worked_hours=Decimal("10.00"),
            regular_hours=Decimal("8.00"),
            overtime_hours=Decimal("2.00"),
            is_approved=True
        )

        self.period = PayrollPeriod.objects.create(
            restaurant=self.restaurant,
            name="September 2026 Monthly",
            frequency="MONTHLY",
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 30),
        )

    def test_labor_cost_report_and_dashboard_summary(self):
        run = PayrollRun.objects.create(
            restaurant=self.restaurant,
            payroll_period=self.period,
            run_number="PR-ANALYTICS-01"
        )
        PayrollService.calculate_payroll(run)
        PayrollService.process_payroll(run, processor=self.admin.user)

        report = WorkforceAnalyticsService.get_labor_cost_report(
            self.restaurant,
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 30)
        )
        self.assertEqual(report["gross_payroll"], "220.00")
        self.assertEqual(report["total_labor_hours"], "10.00")

        summary = WorkforceAnalyticsService.get_workforce_dashboard_summary(self.restaurant)
        self.assertEqual(summary["total_employees"], 2)
        self.assertEqual(summary["clocked_in_now"], 0)
