from decimal import Decimal
from rest_framework import serializers
from .models import (
    Department,
    Position,
    EmployeeDetail,
    EmergencyContact,
    EmployeeDocument,
    Compensation,
    CompensationHistory,
    AttendanceSession,
    AttendanceBreak,
    AttendanceCorrection,
    Shift,
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
    PayrollRun,
    PayrollItem,
    PayrollComponentDetail,
    PayrollAdvance,
)


class DepartmentSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source="manager.display_name", read_only=True)

    class Meta:
        model = Department
        fields = [
            "id", "name", "code", "description", "manager", "manager_name",
            "is_active", "created_at", "updated_at"
        ]


class PositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Position
        fields = [
            "id", "department", "department_name", "title", "code", "description",
            "min_pay", "max_pay", "is_active", "created_at", "updated_at"
        ]


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ["id", "name", "relationship", "phone", "email", "is_primary"]


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source="get_document_type_display", read_only=True)
    verification_status_display = serializers.CharField(source="get_verification_status_display", read_only=True)

    class Meta:
        model = EmployeeDocument
        fields = [
            "id", "document_type", "document_type_display", "document_number",
            "issue_date", "expiry_date", "verification_status", "verification_status_display",
            "notes", "created_at"
        ]


class CompensationSerializer(serializers.ModelSerializer):
    pay_type_display = serializers.CharField(source="get_pay_type_display", read_only=True)

    class Meta:
        model = Compensation
        fields = [
            "id", "pay_type", "pay_type_display", "base_rate",
            "overtime_rate_multiplier", "currency", "effective_date",
            "is_active", "notes"
        ]


class EmployeeDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True)
    manager_name = serializers.CharField(source="manager.display_name", read_only=True)
    staff_display_name = serializers.CharField(source="staff_profile.display_name", read_only=True)
    staff_email = serializers.CharField(source="staff_profile.email", read_only=True)
    staff_employee_id = serializers.CharField(source="staff_profile.employee_id", read_only=True)
    emergency_contacts = EmergencyContactSerializer(source="staff_profile.emergency_contacts", many=True, read_only=True)
    documents = EmployeeDocumentSerializer(source="staff_profile.documents", many=True, read_only=True)
    compensations = CompensationSerializer(source="staff_profile.compensations", many=True, read_only=True)

    class Meta:
        model = EmployeeDetail
        fields = [
            "id", "staff_profile", "staff_display_name", "staff_email", "staff_employee_id",
            "department", "department_name", "position", "position_title",
            "manager", "manager_name", "employment_type", "employment_status",
            "joining_date", "termination_date", "termination_reason",
            "onboarding_checklist", "notes", "emergency_contacts", "documents",
            "compensations", "created_at", "updated_at"
        ]


class AttendanceBreakSerializer(serializers.ModelSerializer):
    break_type_display = serializers.CharField(source="get_break_type_display", read_only=True)

    class Meta:
        model = AttendanceBreak
        fields = ["id", "break_type", "break_type_display", "start_time", "end_time", "duration_minutes", "is_paid"]


class AttendanceSessionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="staff_profile.display_name", read_only=True)
    employee_id_code = serializers.CharField(source="staff_profile.employee_id", read_only=True)
    breaks = AttendanceBreakSerializer(many=True, read_only=True)

    class Meta:
        model = AttendanceSession
        fields = [
            "id", "staff_profile", "employee_name", "employee_id_code", "date",
            "clock_in", "clock_out", "total_break_minutes", "worked_hours",
            "regular_hours", "overtime_hours", "status", "is_approved",
            "notes", "breaks", "created_at", "updated_at"
        ]


class AttendanceCorrectionSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source="requested_by.email", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.email", read_only=True)

    class Meta:
        model = AttendanceCorrection
        fields = [
            "id", "attendance_session", "requested_by", "requested_by_name",
            "requested_clock_in", "requested_clock_out", "reason", "status",
            "reviewed_by", "reviewed_by_name", "reviewed_at", "review_notes", "created_at"
        ]


class ShiftSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True)

    class Meta:
        model = Shift
        fields = [
            "id", "name", "shift_type", "start_time", "end_time",
            "unpaid_break_minutes", "department", "department_name",
            "position", "position_title", "is_active"
        ]


class ShiftScheduleSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="staff_profile.display_name", read_only=True)
    shift_name = serializers.CharField(source="shift.name", read_only=True)
    shift_start_time = serializers.TimeField(source="shift.start_time", read_only=True)
    shift_end_time = serializers.TimeField(source="shift.end_time", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = ShiftSchedule
        fields = [
            "id", "staff_profile", "employee_name", "shift", "shift_name",
            "shift_start_time", "shift_end_time", "shift_date",
            "department", "department_name", "position", "status", "notes", "created_at"
        ]


class ShiftSwapRequestSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(source="requester.display_name", read_only=True)
    target_name = serializers.CharField(source="target_employee.display_name", read_only=True)

    class Meta:
        model = ShiftSwapRequest
        fields = [
            "id", "requester_shift", "target_shift", "requester", "requester_name",
            "target_employee", "target_name", "status", "notes", "created_at"
        ]


class EmployeeAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeAvailability
        fields = ["id", "staff_profile", "day_of_week", "start_time", "end_time", "is_available", "notes"]


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ["id", "name", "code", "is_paid", "default_days_per_year"]


class LeaveAllocationSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    remaining_days = serializers.DecimalField(max_digits=5, decimal_places=1, read_only=True)

    class Meta:
        model = LeaveAllocation
        fields = ["id", "staff_profile", "leave_type", "leave_type_name", "year", "allocated_days", "used_days", "pending_days", "remaining_days"]


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="staff_profile.display_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.email", read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            "id", "staff_profile", "employee_name", "leave_type", "leave_type_name",
            "start_date", "end_date", "days_count", "reason", "status",
            "approved_by", "approved_by_name", "approved_at", "rejection_reason", "created_at"
        ]


class TimesheetSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="staff_profile.display_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.email", read_only=True)

    class Meta:
        model = Timesheet
        fields = [
            "id", "staff_profile", "employee_name", "period_start", "period_end",
            "regular_hours", "overtime_hours", "leave_hours", "holiday_hours",
            "total_hours", "status", "approved_by", "approved_by_name", "approved_at", "notes"
        ]


class PayrollPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = ["id", "name", "frequency", "start_date", "end_date", "status", "closed_at", "created_at"]


class PayrollComponentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollComponentDetail
        fields = ["id", "component_type", "name", "amount", "is_taxable"]


class PayrollItemSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="staff_profile.display_name", read_only=True)
    employee_id_code = serializers.CharField(source="staff_profile.employee_id", read_only=True)
    components = PayrollComponentDetailSerializer(many=True, read_only=True)

    class Meta:
        model = PayrollItem
        fields = [
            "id", "payroll_run", "staff_profile", "employee_name", "employee_id_code",
            "base_pay", "worked_hours", "overtime_hours", "regular_earnings",
            "overtime_pay", "allowances_total", "bonuses_total", "deductions_total",
            "tax_deduction", "gross_pay", "net_pay", "status", "components"
        ]


class PayrollRunSerializer(serializers.ModelSerializer):
    period_name = serializers.CharField(source="payroll_period.name", read_only=True)
    period_start = serializers.DateField(source="payroll_period.start_date", read_only=True)
    period_end = serializers.DateField(source="payroll_period.end_date", read_only=True)
    items = PayrollItemSerializer(many=True, read_only=True)
    journal_entry_number = serializers.CharField(source="journal_entry.entry_number", read_only=True)

    class Meta:
        model = PayrollRun
        fields = [
            "id", "payroll_period", "period_name", "period_start", "period_end",
            "run_number", "status", "total_gross_pay", "total_deductions",
            "total_allowances", "total_bonuses", "total_net_pay", "total_employer_cost",
            "calculated_at", "approved_by", "approved_at", "processed_by", "processed_at",
            "journal_entry", "journal_entry_number", "notes", "items", "created_at"
        ]
