from decimal import Decimal
from django.utils import timezone
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from apps.rbac.permissions import HasActivePermission
from apps.restaurants.models import Restaurant
from apps.staff.models import StaffProfile

from .models import (
    Department,
    Position,
    EmployeeDetail,
    EmergencyContact,
    EmployeeDocument,
    Compensation,
    AttendanceSession,
    AttendanceBreak,
    AttendanceCorrection,
    Shift,
    ShiftSchedule,
    ShiftSwapRequest,
    EmployeeAvailability,
    LeaveType,
    LeaveAllocation,
    LeaveRequest,
    Holiday,
    Timesheet,
    PayrollPeriod,
    PayrollRun,
    PayrollItem,
)
from .serializers import (
    DepartmentSerializer,
    PositionSerializer,
    EmployeeDetailSerializer,
    EmergencyContactSerializer,
    EmployeeDocumentSerializer,
    CompensationSerializer,
    AttendanceSessionSerializer,
    AttendanceCorrectionSerializer,
    ShiftSerializer,
    ShiftScheduleSerializer,
    ShiftSwapRequestSerializer,
    EmployeeAvailabilitySerializer,
    LeaveTypeSerializer,
    LeaveAllocationSerializer,
    LeaveRequestSerializer,
    TimesheetSerializer,
    PayrollPeriodSerializer,
    PayrollRunSerializer,
    PayrollItemSerializer,
)
from .services import (
    EmployeeLifecycleService,
    AttendanceService,
    ShiftSchedulingService,
    LeaveManagementService,
    PayrollService,
    WorkforceAnalyticsService,
)


def _get_restaurant(request):
    tenant_id = getattr(request, "tenant_id", None)
    if not tenant_id and hasattr(request.user, "staff_profiles"):
        staff = request.user.staff_profiles.first()
        if staff:
            return staff.restaurant
    if tenant_id:
        return Restaurant.objects.filter(id=tenant_id).first()
    return Restaurant.objects.first()


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return Department.objects.none()
        return Department.objects.filter(restaurant=restaurant)

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)


class PositionViewSet(viewsets.ModelViewSet):
    serializer_class = PositionSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return Position.objects.none()
        return Position.objects.filter(restaurant=restaurant)

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)


class EmployeeDetailViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeDetailSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return EmployeeDetail.objects.none()
        return EmployeeDetail.objects.filter(restaurant=restaurant).select_related(
            "staff_profile", "department", "position", "manager"
        )

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.attendance.clock")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return AttendanceSession.objects.none()
        qs = AttendanceSession.objects.filter(restaurant=restaurant).select_related("staff_profile")
        # If not manager/admin, filter to own attendance
        user = self.request.user
        staff = user.staff_profiles.filter(restaurant=restaurant).first()
        is_manager = user.is_superuser or (staff and staff.primary_role and staff.primary_role.name in ["Store Manager", "Restaurant Administrator"])
        if not is_manager and staff:
            qs = qs.filter(staff_profile=staff)
        return qs

    @action(detail=False, methods=["post"], url_path="clock-in")
    def clock_in(self, request):
        restaurant = _get_restaurant(request)
        staff_id = request.data.get("staff_profile_id")
        if staff_id:
            staff = StaffProfile.objects.filter(id=staff_id, restaurant=restaurant).first()
        else:
            staff = request.user.staff_profiles.filter(restaurant=restaurant).first()

        if not staff:
            return Response({"error": {"message": "Staff member profile not found."}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = AttendanceService.clock_in(
                restaurant=restaurant,
                staff_profile=staff,
                notes=request.data.get("notes", "")
            )
            return Response(AttendanceSessionSerializer(session).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="clock-out")
    def clock_out(self, request):
        restaurant = _get_restaurant(request)
        staff_id = request.data.get("staff_profile_id")
        if staff_id:
            staff = StaffProfile.objects.filter(id=staff_id, restaurant=restaurant).first()
        else:
            staff = request.user.staff_profiles.filter(restaurant=restaurant).first()

        if not staff:
            return Response({"error": {"message": "Staff member profile not found."}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            session = AttendanceService.clock_out(
                restaurant=restaurant,
                staff_profile=staff,
                notes=request.data.get("notes", "")
            )
            return Response(AttendanceSessionSerializer(session).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="start-break")
    def start_break(self, request, pk=None):
        session = self.get_object()
        break_type = request.data.get("break_type", "LUNCH")
        is_paid = request.data.get("is_paid", False)
        try:
            brk = AttendanceService.start_break(session, break_type=break_type, is_paid=is_paid)
            return Response({"message": "Break started.", "break_id": str(brk.id)}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="end-break")
    def end_break(self, request, pk=None):
        session = self.get_object()
        active_break = AttendanceBreak.objects.filter(attendance_session=session, end_time__isnull=True).first()
        if not active_break:
            return Response({"error": {"message": "No active break in progress."}}, status=status.HTTP_400_BAD_REQUEST)
        AttendanceService.end_break(active_break)
        return Response({"message": "Break ended.", "duration_minutes": active_break.duration_minutes}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="correction")
    def request_correction(self, request, pk=None):
        session = self.get_object()
        req_in = request.data.get("requested_clock_in")
        req_out = request.data.get("requested_clock_out")
        reason = request.data.get("reason", "")
        if not req_in or not req_out or not reason:
            return Response({"error": {"message": "requested_clock_in, requested_clock_out, and reason are required."}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            corr = AttendanceService.request_correction(
                attendance_session=session,
                requested_by=request.user,
                requested_clock_in=req_in,
                requested_clock_out=req_out,
                reason=reason,
            )
            return Response(AttendanceCorrectionSerializer(corr).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)


class AttendanceCorrectionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceCorrectionSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.attendance.manage")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return AttendanceCorrection.objects.none()
        return AttendanceCorrection.objects.filter(restaurant=restaurant)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        corr = self.get_object()
        notes = request.data.get("review_notes", "")
        try:
            approved_corr = AttendanceService.approve_correction(corr, reviewer=request.user, approved=True, review_notes=notes)
            return Response(AttendanceCorrectionSerializer(approved_corr).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        corr = self.get_object()
        notes = request.data.get("review_notes", "")
        try:
            rejected_corr = AttendanceService.approve_correction(corr, reviewer=request.user, approved=False, review_notes=notes)
            return Response(AttendanceCorrectionSerializer(rejected_corr).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)


class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.shifts.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return Shift.objects.none()
        return Shift.objects.filter(restaurant=restaurant)

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)


class ShiftScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftScheduleSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.shifts.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return ShiftSchedule.objects.none()
        qs = ShiftSchedule.objects.filter(restaurant=restaurant).select_related("shift", "staff_profile", "department")
        shift_date = self.request.query_params.get("shift_date")
        if shift_date:
            qs = qs.filter(shift_date=shift_date)
        return qs

    def create(self, request, *args, **kwargs):
        restaurant = _get_restaurant(request)
        staff_id = request.data.get("staff_profile")
        shift_id = request.data.get("shift")
        shift_date = request.data.get("shift_date")

        staff = StaffProfile.objects.filter(id=staff_id, restaurant=restaurant).first()
        shift = Shift.objects.filter(id=shift_id, restaurant=restaurant).first()
        if not staff or not shift or not shift_date:
            return Response({"error": {"message": "staff_profile, shift, and shift_date are required."}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sched = ShiftSchedulingService.schedule_shift(
                restaurant=restaurant,
                staff_profile=staff,
                shift=shift,
                shift_date=shift_date,
                notes=request.data.get("notes", "")
            )
            return Response(ShiftScheduleSerializer(sched).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)


class ShiftSwapRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSwapRequestSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.shifts.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return ShiftSwapRequest.objects.none()
        return ShiftSwapRequest.objects.filter(restaurant=restaurant)

    def create(self, request, *args, **kwargs):
        restaurant = _get_restaurant(request)
        req_shift_id = request.data.get("requester_shift")
        target_emp_id = request.data.get("target_employee")
        target_shift_id = request.data.get("target_shift")

        req_shift = ShiftSchedule.objects.filter(id=req_shift_id, restaurant=restaurant).first()
        target_emp = StaffProfile.objects.filter(id=target_emp_id, restaurant=restaurant).first()
        target_shift = ShiftSchedule.objects.filter(id=target_shift_id, restaurant=restaurant).first() if target_shift_id else None

        if not req_shift or not target_emp:
            return Response({"error": {"message": "requester_shift and target_employee are required."}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            swap = ShiftSchedulingService.request_swap(
                requester_shift=req_shift,
                target_shift=target_shift,
                requester=req_shift.staff_profile,
                target_employee=target_emp,
                notes=request.data.get("notes", "")
            )
            return Response(ShiftSwapRequestSerializer(swap).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        swap = self.get_object()
        try:
            approved_swap = ShiftSchedulingService.approve_swap(swap, approver=request.user)
            return Response(ShiftSwapRequestSerializer(approved_swap).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)


class EmployeeAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeAvailabilitySerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.shifts.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return EmployeeAvailability.objects.none()
        return EmployeeAvailability.objects.filter(restaurant=restaurant)

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)


class LeaveTypeViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.leave.request")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return LeaveType.objects.none()
        return LeaveType.objects.filter(restaurant=restaurant)

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)


class LeaveAllocationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveAllocationSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.leave.request")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return LeaveAllocation.objects.none()
        return LeaveAllocation.objects.filter(restaurant=restaurant).select_related("leave_type")


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.leave.request")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return LeaveRequest.objects.none()
        return LeaveRequest.objects.filter(restaurant=restaurant).select_related("staff_profile", "leave_type")

    def create(self, request, *args, **kwargs):
        restaurant = _get_restaurant(request)
        staff_id = request.data.get("staff_profile")
        leave_type_id = request.data.get("leave_type")
        start_date = request.data.get("start_date")
        end_date = request.data.get("end_date")
        reason = request.data.get("reason", "")

        if staff_id:
            staff = StaffProfile.objects.filter(id=staff_id, restaurant=restaurant).first()
        else:
            staff = request.user.staff_profiles.filter(restaurant=restaurant).first()

        leave_type = LeaveType.objects.filter(id=leave_type_id, restaurant=restaurant).first()
        if not staff or not leave_type or not start_date or not end_date:
            return Response({"error": {"message": "staff_profile, leave_type, start_date, and end_date are required."}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            req = LeaveManagementService.request_leave(
                restaurant=restaurant,
                staff_profile=staff,
                leave_type=leave_type,
                start_date=start_date,
                end_date=end_date,
                reason=reason,
            )
            return Response(LeaveRequestSerializer(req).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        req = self.get_object()
        try:
            approved_req = LeaveManagementService.approve_leave(req, approver=request.user)
            return Response(LeaveRequestSerializer(approved_req).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        req = self.get_object()
        reason = request.data.get("rejection_reason", "")
        try:
            rejected_req = LeaveManagementService.reject_leave(req, approver=request.user, reason=reason)
            return Response(LeaveRequestSerializer(rejected_req).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)


class TimesheetViewSet(viewsets.ModelViewSet):
    serializer_class = TimesheetSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.timesheet.manage")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return Timesheet.objects.none()
        return Timesheet.objects.filter(restaurant=restaurant).select_related("staff_profile")

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        ts = self.get_object()
        ts.status = Timesheet.Status.APPROVED
        ts.approved_by = request.user
        ts.approved_at = timezone.now()
        ts.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        return Response(TimesheetSerializer(ts).data, status=status.HTTP_200_OK)


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.payroll.manage")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return PayrollPeriod.objects.none()
        return PayrollPeriod.objects.filter(restaurant=restaurant)

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)


class PayrollRunViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollRunSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.payroll.manage")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return PayrollRun.objects.none()
        return PayrollRun.objects.filter(restaurant=restaurant).select_related("payroll_period", "journal_entry").prefetch_related("items__components")

    def perform_create(self, serializer):
        restaurant = _get_restaurant(self.request)
        serializer.save(restaurant=restaurant)

    @action(detail=True, methods=["post"], url_path="calculate")
    def calculate(self, request, pk=None):
        run = self.get_object()
        try:
            calc_run = PayrollService.calculate_payroll(run)
            return Response(PayrollRunSerializer(calc_run).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        run = self.get_object()
        run.status = PayrollStatus.APPROVED
        run.approved_by = request.user
        run.approved_at = timezone.now()
        run.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        return Response(PayrollRunSerializer(run).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="process")
    def process(self, request, pk=None):
        run = self.get_object()
        try:
            proc_run = PayrollService.process_payroll(run, processor=request.user)
            return Response(PayrollRunSerializer(proc_run).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)


class PayslipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayrollItemSerializer
    permission_classes = [IsAuthenticated, HasActivePermission("hr.payroll.view")]

    def get_queryset(self):
        restaurant = _get_restaurant(self.request)
        if not restaurant:
            return PayrollItem.objects.none()
        qs = PayrollItem.objects.filter(restaurant=restaurant).select_related("payroll_run", "staff_profile").prefetch_related("components")

        user = self.request.user
        staff = user.staff_profiles.filter(restaurant=restaurant).first()
        is_hr_manager = user.is_superuser or (staff and staff.primary_role and staff.primary_role.name in ["Restaurant Administrator", "Store Manager"])
        if not is_hr_manager:
            if staff:
                qs = qs.filter(staff_profile=staff)
            else:
                return PayrollItem.objects.none()
        return qs


class LaborCostReportView(APIView):
    permission_classes = [IsAuthenticated, HasActivePermission("hr.reports.view")]

    def get(self, request):
        restaurant = _get_restaurant(request)
        if not restaurant:
            return Response({"error": {"message": "Restaurant context not found."}}, status=status.HTTP_400_BAD_REQUEST)

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        report = WorkforceAnalyticsService.get_labor_cost_report(restaurant, start_date, end_date)
        return Response(report, status=status.HTTP_200_OK)


class WorkforceDashboardView(APIView):
    permission_classes = [IsAuthenticated, HasActivePermission("hr.view")]

    def get(self, request):
        restaurant = _get_restaurant(request)
        if not restaurant:
            return Response({"error": {"message": "Restaurant context not found."}}, status=status.HTTP_400_BAD_REQUEST)

        summary = WorkforceAnalyticsService.get_workforce_dashboard_summary(restaurant)
        return Response(summary, status=status.HTTP_200_OK)
