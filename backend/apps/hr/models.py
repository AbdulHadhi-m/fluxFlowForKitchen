from decimal import Decimal
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import UUIDModel, TimeStampedModel
from apps.restaurants.models import Restaurant
from apps.staff.models import StaffProfile

# --------------------------------------------------------------------------
# 1. Organization Structure: Departments & Positions
# --------------------------------------------------------------------------

class Department(UUIDModel, TimeStampedModel):
    """
    Operational department within a restaurant (Kitchen, FOH, Bar, Delivery, etc.)
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="hr_departments"
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    description = models.TextField(blank=True)
    manager = models.ForeignKey(
        StaffProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_departments"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "code"],
                name="unique_department_code_per_restaurant"
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Position(UUIDModel, TimeStampedModel):
    """
    Configurable job title and pay band (Chef, Cook, Waiter, Cashier, etc.)
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="hr_positions"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="positions"
    )
    title = models.CharField(max_length=100)
    code = models.CharField(max_length=30)
    description = models.TextField(blank=True)
    min_pay = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    max_pay = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["title"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "code"],
                name="unique_position_code_per_restaurant"
            )
        ]

    def __str__(self):
        return f"{self.title} ({self.code})"


# --------------------------------------------------------------------------
# 2. Extended Employee Profile, Hierarchy & Lifecycle
# --------------------------------------------------------------------------

class EmploymentType(models.TextChoices):
    FULL_TIME = "FULL_TIME", "Full Time"
    PART_TIME = "PART_TIME", "Part Time"
    CONTRACT = "CONTRACT", "Contract"
    TEMPORARY = "TEMPORARY", "Temporary"
    INTERN = "INTERN", "Intern"
    OTHER = "OTHER", "Other"


class EmploymentStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    ON_LEAVE = "ON_LEAVE", "On Leave"
    SUSPENDED = "SUSPENDED", "Suspended"
    TERMINATED = "TERMINATED", "Terminated"
    RESIGNED = "RESIGNED", "Resigned"
    INACTIVE = "INACTIVE", "Inactive"


class EmployeeDetail(UUIDModel, TimeStampedModel):
    """
    Extended HR metadata attached 1-to-1 with existing Prompt 9 StaffProfile.
    """
    staff_profile = models.OneToOneField(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="hr_detail"
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="employee_hr_details"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees"
    )
    position = models.ForeignKey(
        Position,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employees"
    )
    manager = models.ForeignKey(
        StaffProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="direct_reports"
    )
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME
    )
    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE
    )
    joining_date = models.DateField(default=timezone.now)
    termination_date = models.DateField(null=True, blank=True)
    termination_reason = models.TextField(blank=True)
    onboarding_checklist = models.JSONField(
        default=dict,
        help_text="Checklist items e.g. {profile_completed: true, documents_verified: false}"
    )
    notes = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["restaurant", "employment_status"]),
            models.Index(fields=["restaurant", "department"]),
        ]

    def __str__(self):
        return f"HR Details: {self.staff_profile.display_name} ({self.employment_status})"


class EmergencyContact(UUIDModel, TimeStampedModel):
    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="emergency_contacts"
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="employee_emergency_contacts"
    )
    name = models.CharField(max_length=150)
    relationship = models.CharField(max_length=80)
    phone = models.CharField(max_length=40)
    email = models.EmailField(blank=True)
    is_primary = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.relationship}) - {self.staff_profile.display_name}"


class EmployeeDocument(UUIDModel, TimeStampedModel):
    class DocType(models.TextChoices):
        ID_CARD = "ID_CARD", "National ID / Aadhaar / SSN"
        PASSPORT = "PASSPORT", "Passport"
        DRIVING_LICENSE = "DRIVING_LICENSE", "Driving License"
        FOOD_HANDLER_CERT = "FOOD_HANDLER_CERT", "Food Safety / Hygiene Certificate"
        WORK_PERMIT = "WORK_PERMIT", "Work Permit / Visa"
        CONTRACT = "CONTRACT", "Employment Contract"
        TAX_FORM = "TAX_FORM", "Tax Form W4 / PAN"
        OTHER = "OTHER", "Other Document"

    class VerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Verification"
        VERIFIED = "VERIFIED", "Verified"
        EXPIRED = "EXPIRED", "Expired"
        REJECTED = "REJECTED", "Rejected"

    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="documents"
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="employee_documents"
    )
    document_type = models.CharField(max_length=30, choices=DocType.choices, default=DocType.ID_CARD)
    document_number = models.CharField(max_length=100, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.staff_profile.display_name}"


# --------------------------------------------------------------------------
# 3. Staff Compensation & History
# --------------------------------------------------------------------------

class PayType(models.TextChoices):
    SALARY = "SALARY", "Monthly / Fixed Salary"
    HOURLY = "HOURLY", "Hourly Rate"
    DAILY = "DAILY", "Daily Rate"
    CONTRACT = "CONTRACT", "Fixed Contract"


class Compensation(UUIDModel, TimeStampedModel):
    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="compensations"
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="employee_compensations"
    )
    pay_type = models.CharField(max_length=20, choices=PayType.choices, default=PayType.SALARY)
    base_rate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    overtime_rate_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("1.50"))
    currency = models.CharField(max_length=10, default="USD")
    effective_date = models.DateField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-effective_date"]

    def __str__(self):
        return f"{self.staff_profile.display_name} - {self.pay_type}: ${self.base_rate}"


class CompensationHistory(UUIDModel, TimeStampedModel):
    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="compensation_history"
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    old_rate = models.DecimalField(max_digits=12, decimal_places=2)
    new_rate = models.DecimalField(max_digits=12, decimal_places=2)
    pay_type = models.CharField(max_length=20, choices=PayType.choices)
    effective_date = models.DateField()
    reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )


# --------------------------------------------------------------------------
# 4. Attendance, Breaks, Clock-In/Out & Corrections
# --------------------------------------------------------------------------

class AttendanceStatus(models.TextChoices):
    PRESENT = "PRESENT", "Present"
    ABSENT = "ABSENT", "Absent"
    LATE = "LATE", "Late"
    HALF_DAY = "HALF_DAY", "Half Day"
    ON_LEAVE = "ON_LEAVE", "On Leave"
    HOLIDAY = "HOLIDAY", "Holiday"
    REST_DAY = "REST_DAY", "Rest Day"
    PENDING_REVIEW = "PENDING_REVIEW", "Pending Review"


class AttendanceSession(UUIDModel, TimeStampedModel):
    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="attendance_sessions"
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="attendance_sessions"
    )
    date = models.DateField(db_index=True)
    clock_in = models.DateTimeField(db_index=True)
    clock_out = models.DateTimeField(null=True, blank=True, db_index=True)
    total_break_minutes = models.IntegerField(default=0)
    worked_hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    regular_hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(
        max_length=20,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.PRESENT
    )
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_attendances"
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-clock_in"]
        indexes = [
            models.Index(fields=["restaurant", "date"]),
            models.Index(fields=["restaurant", "staff_profile", "date"]),
        ]

    def __str__(self):
        return f"{self.staff_profile.display_name} - {self.date} ({self.status})"


class AttendanceBreak(UUIDModel, TimeStampedModel):
    class BreakType(models.TextChoices):
        LUNCH = "LUNCH", "Lunch Break"
        REST = "REST", "Rest Break"
        TEA = "TEA", "Tea / Coffee Break"
        OTHER = "OTHER", "Other Break"

    attendance_session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE,
        related_name="breaks"
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    break_type = models.CharField(max_length=20, choices=BreakType.choices, default=BreakType.LUNCH)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"Break {self.break_type} ({self.duration_minutes}m)"


class AttendanceCorrection(UUIDModel, TimeStampedModel):
    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    attendance_session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE,
        related_name="corrections"
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="requested_attendance_corrections"
    )
    requested_clock_in = models.DateTimeField()
    requested_clock_out = models.DateTimeField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_attendance_corrections"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)


# --------------------------------------------------------------------------
# 5. Shifts, Scheduling, Swaps & Availability
# --------------------------------------------------------------------------

class ShiftType(models.TextChoices):
    MORNING = "MORNING", "Morning Shift"
    AFTERNOON = "AFTERNOON", "Afternoon Shift"
    EVENING = "EVENING", "Evening Shift"
    NIGHT = "NIGHT", "Night Shift"
    SPLIT = "SPLIT", "Split Shift"


class Shift(UUIDModel, TimeStampedModel):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="shifts"
    )
    name = models.CharField(max_length=100)
    shift_type = models.CharField(max_length=20, choices=ShiftType.choices, default=ShiftType.MORNING)
    start_time = models.TimeField()
    end_time = models.TimeField()
    unpaid_break_minutes = models.IntegerField(default=30)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    position = models.ForeignKey(Position, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["start_time"]

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')})"


class ShiftSchedule(UUIDModel, TimeStampedModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        CONFIRMED = "CONFIRMED", "Confirmed"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        MISSED = "MISSED", "Missed"
        CANCELLED = "CANCELLED", "Cancelled"

    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="schedules"
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="schedules"
    )
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name="assigned_schedules")
    shift_date = models.DateField(db_index=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    position = models.ForeignKey(Position, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["shift_date", "shift__start_time"]
        indexes = [
            models.Index(fields=["restaurant", "shift_date"]),
            models.Index(fields=["restaurant", "staff_profile", "shift_date"]),
        ]

    def __str__(self):
        return f"{self.staff_profile.display_name} - {self.shift.name} on {self.shift_date}"


class ShiftSwapRequest(UUIDModel, TimeStampedModel):
    class Status(models.TextChoices):
        PENDING_TARGET = "PENDING_TARGET", "Pending Colleague Acceptance"
        PENDING_MANAGER = "PENDING_MANAGER", "Pending Manager Approval"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    requester_shift = models.ForeignKey(
        ShiftSchedule,
        on_delete=models.CASCADE,
        related_name="swap_requests_sent"
    )
    target_shift = models.ForeignKey(
        ShiftSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="swap_requests_received"
    )
    requester = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="requested_swaps"
    )
    target_employee = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="received_swaps"
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_TARGET)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True)


class EmployeeAvailability(UUIDModel, TimeStampedModel):
    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="availabilities"
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    day_of_week = models.IntegerField(help_text="0=Monday, 6=Sunday")
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    is_available = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["day_of_week", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["staff_profile", "day_of_week"],
                name="unique_availability_per_day"
            )
        ]


class StaffingRequirement(UUIDModel, TimeStampedModel):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    day_of_week = models.IntegerField(help_text="0=Monday, 6=Sunday")
    shift = models.ForeignKey(Shift, on_delete=models.SET_NULL, null=True, blank=True)
    min_staff_count = models.IntegerField(default=1)
    ideal_staff_count = models.IntegerField(default=2)


# --------------------------------------------------------------------------
# 6. Leave Management & Holidays
# --------------------------------------------------------------------------

class LeaveType(UUIDModel, TimeStampedModel):
    class Code(models.TextChoices):
        ANNUAL = "ANNUAL", "Annual / Paid Vacation"
        SICK = "SICK", "Sick Leave"
        UNPAID = "UNPAID", "Unpaid Leave"
        EMERGENCY = "EMERGENCY", "Emergency / Casual"
        MATERNITY = "MATERNITY", "Maternity / Paternity"
        OTHER = "OTHER", "Other Leave"

    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, choices=Code.choices, default=Code.ANNUAL)
    is_paid = models.BooleanField(default=True)
    default_days_per_year = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("12.0"))

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "code"],
                name="unique_leave_type_per_restaurant"
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class LeaveAllocation(UUIDModel, TimeStampedModel):
    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="leave_allocations"
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    year = models.IntegerField(default=2026)
    allocated_days = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("12.0"))
    used_days = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("0.0"))
    pending_days = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("0.0"))

    @property
    def remaining_days(self) -> Decimal:
        return self.allocated_days - self.used_days - self.pending_days


class LeaveRequest(UUIDModel, TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="leave_requests"
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    days_count = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("1.0"))
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)


class Holiday(UUIDModel, TimeStampedModel):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    name = models.CharField(max_length=150)
    date = models.DateField(db_index=True)
    is_paid = models.BooleanField(default=True)

    class Meta:
        ordering = ["date"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "date"],
                name="unique_holiday_date_per_restaurant"
            )
        ]


# --------------------------------------------------------------------------
# 7. Timesheets
# --------------------------------------------------------------------------

class Timesheet(UUIDModel, TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        LOCKED = "LOCKED", "Locked / Exported"

    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="timesheets"
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    period_start = models.DateField()
    period_end = models.DateField()
    regular_hours = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0.00"))
    overtime_hours = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0.00"))
    leave_hours = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0.00"))
    holiday_hours = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0.00"))
    total_hours = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-period_start"]


# --------------------------------------------------------------------------
# 8. Payroll Engine, Runs, Advances & Payslips
# --------------------------------------------------------------------------

class PayrollFrequency(models.TextChoices):
    WEEKLY = "WEEKLY", "Weekly"
    BIWEEKLY = "BIWEEKLY", "Bi-Weekly"
    MONTHLY = "MONTHLY", "Monthly"
    CUSTOM = "CUSTOM", "Custom Period"


class PayrollStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    CALCULATING = "CALCULATING", "Calculating"
    PENDING_REVIEW = "PENDING_REVIEW", "Pending Review"
    APPROVED = "APPROVED", "Approved"
    PROCESSED = "PROCESSED", "Processed & Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class PayrollPeriod(UUIDModel, TimeStampedModel):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="payroll_periods"
    )
    name = models.CharField(max_length=100)
    frequency = models.CharField(
        max_length=20,
        choices=PayrollFrequency.choices,
        default=PayrollFrequency.MONTHLY
    )
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=PayrollStatus.choices,
        default=PayrollStatus.DRAFT
    )
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.name} ({self.start_date} to {self.end_date})"


class PayrollRun(UUIDModel, TimeStampedModel):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="payroll_runs"
    )
    payroll_period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.CASCADE,
        related_name="runs"
    )
    run_number = models.CharField(max_length=50, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=PayrollStatus.choices,
        default=PayrollStatus.DRAFT
    )
    total_gross_pay = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_allowances = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_bonuses = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_net_pay = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_employer_cost = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    calculated_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_payrolls"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="processed_payrolls"
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    # Linked to Prompt 29 General Journal
    journal_entry = models.ForeignKey(
        "finance.JournalEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_runs"
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "run_number"],
                name="unique_payroll_run_number_per_restaurant"
            )
        ]

    def __str__(self):
        return f"Payroll Run {self.run_number} ({self.status}) - Net: ${self.total_net_pay}"


class PayrollItem(UUIDModel, TimeStampedModel):
    class ItemStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        PAID = "PAID", "Paid"

    payroll_run = models.ForeignKey(
        PayrollRun,
        on_delete=models.CASCADE,
        related_name="items"
    )
    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="payroll_items"
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    base_pay = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    worked_hours = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0.00"))
    overtime_hours = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0.00"))
    regular_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    overtime_pay = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    allowances_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    bonuses_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    deductions_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    gross_pay = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    net_pay = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=ItemStatus.choices, default=ItemStatus.PENDING)

    def __str__(self):
        return f"Payslip: {self.staff_profile.display_name} - Net: ${self.net_pay}"


class PayrollComponentDetail(UUIDModel, TimeStampedModel):
    class ComponentType(models.TextChoices):
        ALLOWANCE = "ALLOWANCE", "Allowance"
        BONUS = "BONUS", "Bonus"
        DEDUCTION = "DEDUCTION", "Deduction"
        TAX = "TAX", "Tax Deduction"

    payroll_item = models.ForeignKey(
        PayrollItem,
        on_delete=models.CASCADE,
        related_name="components"
    )
    component_type = models.CharField(max_length=20, choices=ComponentType.choices)
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    is_taxable = models.BooleanField(default=True)


class PayrollAdvance(UUIDModel, TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active / Repaying"
        PAID_OFF = "PAID_OFF", "Paid Off"
        WRITTEN_OFF = "WRITTEN_OFF", "Written Off"

    staff_profile = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="payroll_advances"
    )
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date_disbursed = models.DateField(default=timezone.now)
    reason = models.TextField()
    outstanding_amount = models.DecimalField(max_digits=12, decimal_places=2)
    recovery_monthly_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
