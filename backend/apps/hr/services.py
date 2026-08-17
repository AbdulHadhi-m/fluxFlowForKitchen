from decimal import Decimal
from datetime import datetime, time, timedelta
from typing import Optional, List, Dict, Any
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Sum, Q, Count, Avg

from apps.restaurants.models import Restaurant
from apps.staff.models import StaffProfile
from apps.audit.models import AuditAction, AuditEntityType, AuditActorType
from apps.audit.services import AuditLogService
from apps.notifications.models import Notification, NotificationType, NotificationSeverity
from apps.finance.models import Account, JournalEntry
from apps.finance.services import DoubleEntryAccountingService

from .models import (
    Department,
    Position,
    EmployeeDetail,
    EmploymentType,
    EmploymentStatus,
    EmergencyContact,
    EmployeeDocument,
    Compensation,
    CompensationHistory,
    PayType,
    AttendanceSession,
    AttendanceStatus,
    AttendanceBreak,
    AttendanceCorrection,
    Shift,
    ShiftType,
    ShiftSchedule,
    ShiftSwapRequest,
    EmployeeAvailability,
    StaffingRequirement,
    LeaveType,
    LeaveAllocation,
    LeaveRequest,
    Holiday,
    Timesheet,
    PayrollPeriod,
    PayrollFrequency,
    PayrollStatus,
    PayrollRun,
    PayrollItem,
    PayrollComponentDetail,
    PayrollAdvance,
)


class EmployeeLifecycleService:
    @staticmethod
    def get_or_create_hr_detail(staff_profile: StaffProfile) -> EmployeeDetail:
        detail, _ = EmployeeDetail.objects.get_or_create(
            staff_profile=staff_profile,
            defaults={
                "restaurant": staff_profile.restaurant,
                "employment_type": EmploymentType.FULL_TIME,
                "employment_status": EmploymentStatus.ACTIVE,
                "joining_date": timezone.now().date(),
                "onboarding_checklist": {
                    "profile_completed": True,
                    "documents_verified": False,
                    "role_assigned": True,
                    "department_assigned": False,
                    "payroll_configured": False,
                    "training_completed": False,
                },
            },
        )
        return detail

    @staticmethod
    @transaction.atomic
    def offboard_employee(
        staff_profile: StaffProfile,
        termination_date,
        reason: str,
        actor=None
    ) -> EmployeeDetail:
        detail = EmployeeLifecycleService.get_or_create_hr_detail(staff_profile)
        detail.employment_status = EmploymentStatus.TERMINATED
        detail.termination_date = termination_date
        detail.termination_reason = reason
        detail.save(update_fields=["employment_status", "termination_date", "termination_reason", "updated_at"])

        # Disable StaffProfile and invalidate active sessions
        staff_profile.status = StaffProfile.StaffStatus.DISABLED
        staff_profile.save(update_fields=["status", "updated_at"])

        AuditLogService.record(
            action=AuditAction.STATUS_CHANGED,
            entity_type=AuditEntityType.EMPLOYEE_DETAIL,
            entity_id=str(detail.id),
            description=f"Employee {staff_profile.display_name} offboarded: {reason}",
            restaurant=staff_profile.restaurant,
            actor_user=actor if getattr(actor, "is_authenticated", False) else None,
            actor_type=AuditActorType.USER if actor else AuditActorType.SYSTEM,
            metadata={
                "event": "EMPLOYEE_OFFBOARDED",
                "employee_id": staff_profile.employee_id,
                "termination_date": str(termination_date),
                "reason": reason,
            },
        )
        return detail


class AttendanceService:
    @staticmethod
    @transaction.atomic
    def clock_in(
        restaurant: Restaurant,
        staff_profile: StaffProfile,
        clock_in_time: Optional[datetime] = None,
        notes: str = ""
    ) -> AttendanceSession:
        if staff_profile.status != StaffProfile.StaffStatus.ACTIVE:
            raise ValidationError("Cannot clock in: Staff member account is inactive.")

        detail = EmployeeLifecycleService.get_or_create_hr_detail(staff_profile)
        if detail.employment_status != EmploymentStatus.ACTIVE:
            raise ValidationError(f"Cannot clock in: Employment status is {detail.employment_status}.")

        # Check no active open session exists
        active_session = AttendanceSession.objects.filter(
            staff_profile=staff_profile,
            clock_out__isnull=True
        ).first()
        if active_session:
            raise ValidationError(f"Employee already clocked in on session #{active_session.id} at {active_session.clock_in}.")

        now_dt = clock_in_time or timezone.now()
        session = AttendanceSession.objects.create(
            restaurant=restaurant,
            staff_profile=staff_profile,
            date=now_dt.date(),
            clock_in=now_dt,
            status=AttendanceStatus.PRESENT,
            notes=notes,
        )

        AuditLogService.record(
            action=AuditAction.CREATE,
            entity_type=AuditEntityType.ATTENDANCE_SESSION,
            entity_id=str(session.id),
            description=f"Staff {staff_profile.display_name} clocked in",
            restaurant=restaurant,
            actor_user=staff_profile.user,
            metadata={"event": "CLOCK_IN", "time": now_dt.isoformat(), "employee": staff_profile.display_name},
        )
        return session

    @staticmethod
    @transaction.atomic
    def clock_out(
        restaurant: Restaurant,
        staff_profile: StaffProfile,
        clock_out_time: Optional[datetime] = None,
        notes: str = ""
    ) -> AttendanceSession:
        session = AttendanceSession.objects.filter(
            staff_profile=staff_profile,
            clock_out__isnull=True
        ).select_for_update().first()

        if not session:
            raise ValidationError("No active clock-in session found for employee.")

        now_dt = clock_out_time or timezone.now()
        if now_dt <= session.clock_in:
            raise ValidationError("Clock-out time must be after clock-in time.")

        # Close any open breaks
        open_break = AttendanceBreak.objects.filter(attendance_session=session, end_time__isnull=True).first()
        if open_break:
            open_break.end_time = now_dt
            duration = int((now_dt - open_break.start_time).total_seconds() / 60)
            open_break.duration_minutes = max(0, duration)
            open_break.save(update_fields=["end_time", "duration_minutes", "updated_at"])

        # Calculate total break minutes
        breaks_qs = AttendanceBreak.objects.filter(attendance_session=session, is_paid=False)
        total_unpaid_break_mins = sum(b.duration_minutes for b in breaks_qs)
        session.total_break_minutes = total_unpaid_break_mins

        # Calculate worked hours
        total_seconds = (now_dt - session.clock_in).total_seconds()
        worked_mins = max(0, (total_seconds / 60) - total_unpaid_break_mins)
        worked_hours = Decimal(worked_mins / 60).quantize(Decimal("0.01"))

        session.clock_out = now_dt
        session.worked_hours = worked_hours

        # 8-hour regular threshold
        if worked_hours > Decimal("8.00"):
            session.regular_hours = Decimal("8.00")
            session.overtime_hours = worked_hours - Decimal("8.00")
        else:
            session.regular_hours = worked_hours
            session.overtime_hours = Decimal("0.00")

        if notes:
            session.notes = f"{session.notes} | {notes}".strip(" |")

        session.save(update_fields=[
            "clock_out", "total_break_minutes", "worked_hours",
            "regular_hours", "overtime_hours", "notes", "updated_at"
        ])

        AuditLogService.record(
            action=AuditAction.UPDATE,
            entity_type=AuditEntityType.ATTENDANCE_SESSION,
            entity_id=str(session.id),
            description=f"Staff {staff_profile.display_name} clocked out. Worked hours: {worked_hours}",
            restaurant=restaurant,
            actor_user=staff_profile.user,
            metadata={"event": "CLOCK_OUT", "worked_hours": str(worked_hours)},
        )
        return session

    @staticmethod
    def start_break(
        attendance_session: AttendanceSession,
        break_type: str = "LUNCH",
        is_paid: bool = False
    ) -> AttendanceBreak:
        if attendance_session.clock_out:
            raise ValidationError("Cannot start a break on a completed attendance session.")

        active_break = AttendanceBreak.objects.filter(
            attendance_session=attendance_session,
            end_time__isnull=True
        ).first()
        if active_break:
            raise ValidationError("A break session is already in progress.")

        return AttendanceBreak.objects.create(
            attendance_session=attendance_session,
            restaurant=attendance_session.restaurant,
            break_type=break_type,
            start_time=timezone.now(),
            is_paid=is_paid,
        )

    @staticmethod
    def end_break(attendance_break: AttendanceBreak) -> AttendanceBreak:
        if attendance_break.end_time:
            return attendance_break

        now_dt = timezone.now()
        attendance_break.end_time = now_dt
        duration = int((now_dt - attendance_break.start_time).total_seconds() / 60)
        attendance_break.duration_minutes = max(0, duration)
        attendance_break.save(update_fields=["end_time", "duration_minutes", "updated_at"])
        return attendance_break

    @staticmethod
    def request_correction(
        attendance_session: AttendanceSession,
        requested_by,
        requested_clock_in: datetime,
        requested_clock_out: datetime,
        reason: str
    ) -> AttendanceCorrection:
        if requested_clock_out <= requested_clock_in:
            raise ValidationError("Requested clock out must be after requested clock in.")

        return AttendanceCorrection.objects.create(
            attendance_session=attendance_session,
            restaurant=attendance_session.restaurant,
            requested_by=requested_by,
            requested_clock_in=requested_clock_in,
            requested_clock_out=requested_clock_out,
            reason=reason,
            status=AttendanceCorrection.Status.SUBMITTED,
        )

    @staticmethod
    @transaction.atomic
    def approve_correction(
        correction: AttendanceCorrection,
        reviewer,
        approved: bool = True,
        review_notes: str = ""
    ) -> AttendanceCorrection:
        if correction.status != AttendanceCorrection.Status.SUBMITTED:
            raise ValidationError(f"Correction request is already {correction.status}.")

        correction.reviewed_by = reviewer
        correction.reviewed_at = timezone.now()
        correction.review_notes = review_notes

        if approved:
            correction.status = AttendanceCorrection.Status.APPROVED
            session = correction.attendance_session
            session.clock_in = correction.requested_clock_in
            session.clock_out = correction.requested_clock_out

            total_seconds = (correction.requested_clock_out - correction.requested_clock_in).total_seconds()
            worked_hours = Decimal(total_seconds / 3600).quantize(Decimal("0.01"))
            session.worked_hours = worked_hours
            session.regular_hours = min(worked_hours, Decimal("8.00"))
            session.overtime_hours = max(Decimal("0.00"), worked_hours - Decimal("8.00"))
            session.is_approved = True
            session.approved_by = reviewer
            session.save(update_fields=[
                "clock_in", "clock_out", "worked_hours", "regular_hours",
                "overtime_hours", "is_approved", "approved_by", "updated_at"
            ])
        else:
            correction.status = AttendanceCorrection.Status.REJECTED

        correction.save(update_fields=["status", "reviewed_by", "reviewed_at", "review_notes", "updated_at"])
        return correction


class ShiftSchedulingService:
    @staticmethod
    def schedule_shift(
        restaurant: Restaurant,
        staff_profile: StaffProfile,
        shift: Shift,
        shift_date,
        department: Optional[Department] = None,
        position: Optional[Position] = None,
        notes: str = ""
    ) -> ShiftSchedule:
        if staff_profile.status != StaffProfile.StaffStatus.ACTIVE:
            raise ValidationError("Cannot assign shift to inactive staff member.")

        # Check for overlapping shifts on the same date
        existing_schedules = ShiftSchedule.objects.filter(
            restaurant=restaurant,
            staff_profile=staff_profile,
            shift_date=shift_date,
            status__in=[ShiftSchedule.Status.SCHEDULED, ShiftSchedule.Status.CONFIRMED, ShiftSchedule.Status.IN_PROGRESS]
        ).select_related("shift")

        for sched in existing_schedules:
            # Overlap check between shift.start_time / end_time
            if not (shift.end_time <= sched.shift.start_time or shift.start_time >= sched.shift.end_time):
                raise ValidationError(
                    f"Shift scheduling conflict: {staff_profile.display_name} is already scheduled on {sched.shift.name} ({sched.shift.start_time}-{sched.shift.end_time})."
                )

        return ShiftSchedule.objects.create(
            restaurant=restaurant,
            staff_profile=staff_profile,
            shift=shift,
            shift_date=shift_date,
            department=department or shift.department,
            position=position or shift.position,
            status=ShiftSchedule.Status.SCHEDULED,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def request_swap(
        requester_shift: ShiftSchedule,
        target_shift: Optional[ShiftSchedule],
        requester: StaffProfile,
        target_employee: StaffProfile,
        notes: str = ""
    ) -> ShiftSwapRequest:
        return ShiftSwapRequest.objects.create(
            restaurant=requester_shift.restaurant,
            requester_shift=requester_shift,
            target_shift=target_shift,
            requester=requester,
            target_employee=target_employee,
            status=ShiftSwapRequest.Status.PENDING_TARGET,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def approve_swap(swap_request: ShiftSwapRequest, approver) -> ShiftSwapRequest:
        if swap_request.status not in [ShiftSwapRequest.Status.PENDING_TARGET, ShiftSwapRequest.Status.PENDING_MANAGER]:
            raise ValidationError(f"Cannot approve swap in status {swap_request.status}.")

        swap_request.status = ShiftSwapRequest.Status.APPROVED
        swap_request.approved_by = approver
        swap_request.save(update_fields=["status", "approved_by", "updated_at"])

        # Reassign shifts
        req_shift = swap_request.requester_shift
        req_shift.staff_profile = swap_request.target_employee
        req_shift.save(update_fields=["staff_profile", "updated_at"])

        if swap_request.target_shift:
            tgt_shift = swap_request.target_shift
            tgt_shift.staff_profile = swap_request.requester
            tgt_shift.save(update_fields=["staff_profile", "updated_at"])

        return swap_request


class LeaveManagementService:
    @staticmethod
    @transaction.atomic
    def request_leave(
        restaurant: Restaurant,
        staff_profile: StaffProfile,
        leave_type: LeaveType,
        start_date,
        end_date,
        reason: str
    ) -> LeaveRequest:
        if end_date < start_date:
            raise ValidationError("End date cannot be prior to start date.")

        days_count = Decimal((end_date - start_date).days + 1)

        # Check overlapping leave requests
        overlaps = LeaveRequest.objects.filter(
            staff_profile=staff_profile,
            status__in=[LeaveRequest.Status.SUBMITTED, LeaveRequest.Status.APPROVED],
            start_date__lte=end_date,
            end_date__gte=start_date,
        ).exists()
        if overlaps:
            raise ValidationError("Overlapping leave request already exists for this date range.")

        # Check allocation balance
        allocation, _ = LeaveAllocation.objects.get_or_create(
            staff_profile=staff_profile,
            restaurant=restaurant,
            leave_type=leave_type,
            year=start_date.year,
            defaults={"allocated_days": leave_type.default_days_per_year}
        )
        if allocation.remaining_days < days_count:
            # Still allow if unpaid or emergency, but warn
            pass

        allocation.pending_days += days_count
        allocation.save(update_fields=["pending_days", "updated_at"])

        return LeaveRequest.objects.create(
            restaurant=restaurant,
            staff_profile=staff_profile,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            days_count=days_count,
            reason=reason,
            status=LeaveRequest.Status.SUBMITTED,
        )

    @staticmethod
    @transaction.atomic
    def approve_leave(leave_request: LeaveRequest, approver) -> LeaveRequest:
        if leave_request.status != LeaveRequest.Status.SUBMITTED:
            raise ValidationError(f"Leave request is already {leave_request.status}.")

        leave_request.status = LeaveRequest.Status.APPROVED
        leave_request.approved_by = approver
        leave_request.approved_at = timezone.now()
        leave_request.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])

        allocation = LeaveAllocation.objects.filter(
            staff_profile=leave_request.staff_profile,
            leave_type=leave_request.leave_type,
            year=leave_request.start_date.year
        ).first()
        if allocation:
            allocation.pending_days = max(Decimal("0.0"), allocation.pending_days - leave_request.days_count)
            allocation.used_days += leave_request.days_count
            allocation.save(update_fields=["pending_days", "used_days", "updated_at"])

        return leave_request

    @staticmethod
    @transaction.atomic
    def reject_leave(leave_request: LeaveRequest, approver, reason: str = "") -> LeaveRequest:
        if leave_request.status != LeaveRequest.Status.SUBMITTED:
            raise ValidationError(f"Leave request is already {leave_request.status}.")

        leave_request.status = LeaveRequest.Status.REJECTED
        leave_request.approved_by = approver
        leave_request.approved_at = timezone.now()
        leave_request.rejection_reason = reason
        leave_request.save(update_fields=["status", "approved_by", "approved_at", "rejection_reason", "updated_at"])

        allocation = LeaveAllocation.objects.filter(
            staff_profile=leave_request.staff_profile,
            leave_type=leave_request.leave_type,
            year=leave_request.start_date.year
        ).first()
        if allocation:
            allocation.pending_days = max(Decimal("0.0"), allocation.pending_days - leave_request.days_count)
            allocation.save(update_fields=["pending_days", "updated_at"])

        return leave_request


class PayrollService:
    @staticmethod
    @transaction.atomic
    def calculate_payroll(payroll_run: PayrollRun) -> PayrollRun:
        if payroll_run.status == PayrollStatus.PROCESSED:
            raise ValidationError("Cannot recalculate an already PROCESSED payroll run.")

        payroll_run.status = PayrollStatus.CALCULATING
        payroll_run.save(update_fields=["status", "updated_at"])

        # Delete previous draft items
        payroll_run.items.all().delete()

        period = payroll_run.payroll_period
        restaurant = payroll_run.restaurant

        # Fetch active staff
        staff_members = StaffProfile.objects.filter(
            restaurant=restaurant,
            status=StaffProfile.StaffStatus.ACTIVE
        ).select_related("user")

        total_gross = Decimal("0.00")
        total_deductions = Decimal("0.00")
        total_allowances = Decimal("0.00")
        total_bonuses = Decimal("0.00")
        total_net = Decimal("0.00")

        for staff in staff_members:
            comp = Compensation.objects.filter(
                staff_profile=staff,
                restaurant=restaurant,
                is_active=True
            ).first()

            base_rate = comp.base_rate if comp else Decimal("15.00")
            pay_type = comp.pay_type if comp else PayType.HOURLY
            ot_multiplier = comp.overtime_rate_multiplier if comp else Decimal("1.50")

            # Aggregate worked hours from attendance in this period
            att_qs = AttendanceSession.objects.filter(
                restaurant=restaurant,
                staff_profile=staff,
                date__gte=period.start_date,
                date__lte=period.end_date,
            )
            worked_hours = sum((a.worked_hours for a in att_qs), Decimal("0.00"))
            overtime_hours = sum((a.overtime_hours for a in att_qs), Decimal("0.00"))
            regular_hours = worked_hours - overtime_hours

            if pay_type == PayType.HOURLY:
                regular_earnings = (regular_hours * base_rate).quantize(Decimal("0.01"))
                overtime_pay = (overtime_hours * base_rate * ot_multiplier).quantize(Decimal("0.01"))
                base_pay = regular_earnings
            else:  # SALARY or CONTRACT
                base_pay = base_rate
                regular_earnings = base_rate
                overtime_pay = (overtime_hours * (base_rate / Decimal("160.00")) * ot_multiplier).quantize(Decimal("0.01"))

            allowances_total = Decimal("0.00")
            bonuses_total = Decimal("0.00")

            # Flat 10% standard tax estimate
            gross_pay = regular_earnings + overtime_pay + allowances_total + bonuses_total
            tax_deduction = (gross_pay * Decimal("0.10")).quantize(Decimal("0.01"))
            
            # Check advances recovery
            advance = PayrollAdvance.objects.filter(
                staff_profile=staff,
                restaurant=restaurant,
                status=PayrollAdvance.Status.ACTIVE
            ).first()
            advance_deduction = Decimal("0.00")
            if advance and advance.outstanding_amount > 0:
                advance_deduction = min(advance.outstanding_amount, advance.recovery_monthly_amount or Decimal("50.00"))
                advance.outstanding_amount -= advance_deduction
                if advance.outstanding_amount <= Decimal("0.00"):
                    advance.status = PayrollAdvance.Status.PAID_OFF
                advance.save(update_fields=["outstanding_amount", "status", "updated_at"])

            deductions_total = tax_deduction + advance_deduction
            net_pay = max(Decimal("0.00"), gross_pay - deductions_total)

            item = PayrollItem.objects.create(
                payroll_run=payroll_run,
                staff_profile=staff,
                restaurant=restaurant,
                base_pay=base_pay,
                worked_hours=worked_hours,
                overtime_hours=overtime_hours,
                regular_earnings=regular_earnings,
                overtime_pay=overtime_pay,
                allowances_total=allowances_total,
                bonuses_total=bonuses_total,
                deductions_total=deductions_total,
                tax_deduction=tax_deduction,
                gross_pay=gross_pay,
                net_pay=net_pay,
                status=PayrollItem.ItemStatus.PENDING,
            )

            # Components breakdown
            PayrollComponentDetail.objects.create(
                payroll_item=item,
                component_type=PayrollComponentDetail.ComponentType.TAX,
                name="Income Tax Withholding (10%)",
                amount=tax_deduction,
                is_taxable=False,
            )
            if advance_deduction > 0:
                PayrollComponentDetail.objects.create(
                    payroll_item=item,
                    component_type=PayrollComponentDetail.ComponentType.DEDUCTION,
                    name="Payroll Advance Recovery",
                    amount=advance_deduction,
                    is_taxable=False,
                )

            total_gross += gross_pay
            total_deductions += deductions_total
            total_allowances += allowances_total
            total_bonuses += bonuses_total
            total_net += net_pay

        payroll_run.total_gross_pay = total_gross
        payroll_run.total_deductions = total_deductions
        payroll_run.total_allowances = total_allowances
        payroll_run.total_bonuses = total_bonuses
        payroll_run.total_net_pay = total_net
        payroll_run.total_employer_cost = total_gross
        payroll_run.calculated_at = timezone.now()
        payroll_run.status = PayrollStatus.PENDING_REVIEW
        payroll_run.save()

        return payroll_run

    @staticmethod
    @transaction.atomic
    def process_payroll(payroll_run: PayrollRun, processor) -> PayrollRun:
        # Idempotency guard
        if payroll_run.status == PayrollStatus.PROCESSED:
            return payroll_run

        payroll_run.status = PayrollStatus.PROCESSED
        payroll_run.processed_by = processor
        payroll_run.processed_at = timezone.now()

        # Generate Double-Entry General Journal in Prompt 29 Finance
        # Debit: #6000 Wages & Salaries Expense (total_gross_pay)
        # Credit: #2100 Tax Payable (total_taxes)
        # Credit: #2000 Payroll Payable (total_net_pay)
        wages_account = Account.objects.filter(restaurant=payroll_run.restaurant, code="6000").first()
        tax_account = Account.objects.filter(restaurant=payroll_run.restaurant, code="2100").first()
        payroll_payable = Account.objects.filter(restaurant=payroll_run.restaurant, code="2000").first()

        if wages_account and tax_account and payroll_payable and payroll_run.total_gross_pay > 0:
            total_tax = sum(item.tax_deduction for item in payroll_run.items.all())
            other_deductions = payroll_run.total_deductions - total_tax

            lines = [
                {
                    "account_id": str(wages_account.id),
                    "debit": payroll_run.total_gross_pay,
                    "credit": Decimal("0.00"),
                    "description": f"Payroll Wages Run #{payroll_run.run_number}",
                    "cost_center": "ADMIN",
                },
                {
                    "account_id": str(tax_account.id),
                    "debit": Decimal("0.00"),
                    "credit": total_tax,
                    "description": f"Payroll Tax Withheld Run #{payroll_run.run_number}",
                    "cost_center": "ADMIN",
                },
                {
                    "account_id": str(payroll_payable.id),
                    "debit": Decimal("0.00"),
                    "credit": payroll_run.total_net_pay + other_deductions,
                    "description": f"Net Payroll Payable Run #{payroll_run.run_number}",
                    "cost_center": "ADMIN",
                },
            ]

            journal = DoubleEntryAccountingService.create_journal_entry(
                restaurant=payroll_run.restaurant,
                entry_date=payroll_run.payroll_period.end_date,
                source_document_type="MANUAL",
                lines=lines,
                user=processor,
                source_id=str(payroll_run.id),
                notes=f"Automated Payroll Settlement for Period {payroll_run.payroll_period.name}",
                auto_post=True,
            )
            payroll_run.journal_entry = journal

        payroll_run.items.all().update(status=PayrollItem.ItemStatus.APPROVED)
        payroll_run.save()

        AuditLogService.record(
            action=AuditAction.APPROVED,
            entity_type=AuditEntityType.PAYROLL_RUN,
            entity_id=str(payroll_run.id),
            description=f"Payroll Run {payroll_run.run_number} processed. Net Pay: ${payroll_run.total_net_pay}",
            restaurant=payroll_run.restaurant,
            actor_user=processor,
            metadata={
                "event": "PAYROLL_PROCESSED",
                "run_number": payroll_run.run_number,
                "net_pay": str(payroll_run.total_net_pay),
                "journal_id": str(payroll_run.journal_entry.id) if payroll_run.journal_entry else None,
            },
        )
        return payroll_run


class WorkforceAnalyticsService:
    @staticmethod
    def get_labor_cost_report(restaurant: Restaurant, start_date=None, end_date=None) -> Dict[str, Any]:
        runs = PayrollRun.objects.filter(restaurant=restaurant, status=PayrollStatus.PROCESSED)
        if start_date:
            runs = runs.filter(payroll_period__start_date__gte=start_date)
        if end_date:
            runs = runs.filter(payroll_period__end_date__lte=end_date)

        total_gross = sum((r.total_gross_pay for r in runs), Decimal("0.00"))
        total_net = sum((r.total_net_pay for r in runs), Decimal("0.00"))
        total_overtime = Decimal("0.00")
        for r in runs:
            total_overtime += sum((item.overtime_pay for item in r.items.all()), Decimal("0.00"))

        # Fetch total worked hours
        att_qs = AttendanceSession.objects.filter(restaurant=restaurant)
        if start_date:
            att_qs = att_qs.filter(date__gte=start_date)
        if end_date:
            att_qs = att_qs.filter(date__lte=end_date)
        total_hours = sum((a.worked_hours for a in att_qs), Decimal("0.00"))

        # Mock / calculate revenue reference
        from apps.finance.services import FinancialReportingService
        pnl = FinancialReportingService.generate_profit_and_loss(
            restaurant,
            start_date or (timezone.now().date() - timedelta(days=30)),
            end_date or timezone.now().date()
        )
        net_revenue = Decimal(pnl["revenue"]["net_revenue"])

        labor_cost_pct = Decimal("0.00")
        if net_revenue > 0:
            labor_cost_pct = ((total_gross / net_revenue) * Decimal("100.00")).quantize(Decimal("0.01"))

        sales_per_hour = Decimal("0.00")
        if total_hours > 0:
            sales_per_hour = (net_revenue / total_hours).quantize(Decimal("0.01"))

        return {
            "period": {"start_date": str(start_date) if start_date else None, "end_date": str(end_date) if end_date else None},
            "gross_payroll": str(total_gross),
            "net_payroll": str(total_net),
            "overtime_cost": str(total_overtime),
            "total_labor_hours": str(total_hours),
            "net_revenue": str(net_revenue),
            "labor_cost_percentage": f"{labor_cost_pct}%",
            "sales_per_labor_hour": str(sales_per_hour),
        }

    @staticmethod
    def get_workforce_dashboard_summary(restaurant: Restaurant) -> Dict[str, Any]:
        today = timezone.now().date()

        total_employees = StaffProfile.objects.filter(
            restaurant=restaurant,
            status=StaffProfile.StaffStatus.ACTIVE
        ).count()

        clocked_in = AttendanceSession.objects.filter(
            restaurant=restaurant,
            clock_out__isnull=True
        ).count()

        scheduled_today = ShiftSchedule.objects.filter(
            restaurant=restaurant,
            shift_date=today,
            status__in=[ShiftSchedule.Status.SCHEDULED, ShiftSchedule.Status.CONFIRMED, ShiftSchedule.Status.IN_PROGRESS]
        ).count()

        on_leave = LeaveRequest.objects.filter(
            restaurant=restaurant,
            status=LeaveRequest.Status.APPROVED,
            start_date__lte=today,
            end_date__gte=today,
        ).count()

        pending_leave_requests = LeaveRequest.objects.filter(
            restaurant=restaurant,
            status=LeaveRequest.Status.SUBMITTED
        ).count()

        pending_corrections = AttendanceCorrection.objects.filter(
            restaurant=restaurant,
            status=AttendanceCorrection.Status.SUBMITTED
        ).count()

        open_payroll_runs = PayrollRun.objects.filter(
            restaurant=restaurant,
            status__in=[PayrollStatus.DRAFT, PayrollStatus.PENDING_REVIEW]
        ).count()

        return {
            "total_employees": total_employees,
            "clocked_in_now": clocked_in,
            "scheduled_today": scheduled_today,
            "on_leave_today": on_leave,
            "pending_leave_approvals": pending_leave_requests,
            "pending_attendance_corrections": pending_corrections,
            "open_payroll_runs": open_payroll_runs,
        }
