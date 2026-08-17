from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from apps.restaurants.models import Restaurant
from apps.staff.models import StaffProfile
from apps.staff.services import StaffService
from apps.rbac.services import RBACService
from apps.finance.services import ChartOfAccountsService
from apps.hr.models import (
    Compensation,
    PayType,
    AttendanceSession,
    PayrollPeriod,
    PayrollFrequency,
    PayrollRun,
    PayrollStatus,
    PayrollAdvance,
)
from apps.hr.services import PayrollService

class PayrollCalculationAndAccountingTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.restaurant = Restaurant.objects.create(name="Bistro Paris", slug="bistro-paris")

        # Seed finance accounts
        ChartOfAccountsService.seed_default_chart_of_accounts(self.restaurant)

        # Staff 1: Hourly Employee ($20/hr, 1.5x OT)
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

        # Record 10 hours worked (8 regular @ $20 = $160, 2 overtime @ $30 = $60, gross = $220)
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
            frequency=PayrollFrequency.MONTHLY,
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 30),
            status=PayrollStatus.DRAFT
        )

    def test_payroll_calculation_and_advance_recovery(self):
        # Give $50 advance, $20 recovery per month
        PayrollAdvance.objects.create(
            staff_profile=self.staff1,
            restaurant=self.restaurant,
            amount=Decimal("50.00"),
            outstanding_amount=Decimal("50.00"),
            recovery_monthly_amount=Decimal("20.00"),
            reason="Relocation assistance"
        )

        run = PayrollRun.objects.create(
            restaurant=self.restaurant,
            payroll_period=self.period,
            run_number="PR-2026-09"
        )

        calc_run = PayrollService.calculate_payroll(run)
        self.assertEqual(calc_run.status, PayrollStatus.PENDING_REVIEW)
        self.assertEqual(calc_run.total_gross_pay, Decimal("220.00"))  # 160 reg + 60 ot

        # Tax is 10% ($22.00), Advance is $20.00 -> Total deductions = $42.00
        self.assertEqual(calc_run.total_deductions, Decimal("42.00"))
        # Net pay = 220 - 42 = $178.00
        self.assertEqual(calc_run.total_net_pay, Decimal("178.00"))

    def test_payroll_processing_generates_finance_journal(self):
        run = PayrollRun.objects.create(
            restaurant=self.restaurant,
            payroll_period=self.period,
            run_number="PR-2026-09-02"
        )
        PayrollService.calculate_payroll(run)

        # Process payroll
        processed = PayrollService.process_payroll(run, processor=self.admin.user)
        self.assertEqual(processed.status, PayrollStatus.PROCESSED)
        self.assertIsNotNone(processed.journal_entry)

        # Verify double-entry balance in general journal
        journal = processed.journal_entry
        self.assertTrue(journal.is_balanced)
        self.assertEqual(journal.total_debit, journal.total_credit)
        self.assertEqual(journal.total_debit, Decimal("220.00"))  # Debit 6000 Wages Expense

        # Idempotency: re-processing returns same run without creating duplicate journal
        reprocessed = PayrollService.process_payroll(run, processor=self.admin.user)
        self.assertEqual(reprocessed.id, processed.id)
        self.assertEqual(reprocessed.journal_entry.id, journal.id)
