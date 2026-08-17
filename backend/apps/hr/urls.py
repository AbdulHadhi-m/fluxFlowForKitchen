from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet,
    PositionViewSet,
    EmployeeDetailViewSet,
    AttendanceSessionViewSet,
    AttendanceCorrectionViewSet,
    ShiftViewSet,
    ShiftScheduleViewSet,
    ShiftSwapRequestViewSet,
    EmployeeAvailabilityViewSet,
    LeaveTypeViewSet,
    LeaveAllocationViewSet,
    LeaveRequestViewSet,
    TimesheetViewSet,
    PayrollPeriodViewSet,
    PayrollRunViewSet,
    PayslipViewSet,
    LaborCostReportView,
    WorkforceDashboardView,
)

router = DefaultRouter()
router.register(r"departments", DepartmentViewSet, basename="hr-department")
router.register(r"positions", PositionViewSet, basename="hr-position")
router.register(r"employees", EmployeeDetailViewSet, basename="hr-employee")
router.register(r"attendance", AttendanceSessionViewSet, basename="hr-attendance")
router.register(r"attendance-corrections", AttendanceCorrectionViewSet, basename="hr-attendance-correction")
router.register(r"shifts", ShiftViewSet, basename="hr-shift")
router.register(r"schedules", ShiftScheduleViewSet, basename="hr-schedule")
router.register(r"shift-swaps", ShiftSwapRequestViewSet, basename="hr-shift-swap")
router.register(r"availability", EmployeeAvailabilityViewSet, basename="hr-availability")
router.register(r"leave-types", LeaveTypeViewSet, basename="hr-leave-type")
router.register(r"leave-allocations", LeaveAllocationViewSet, basename="hr-leave-allocation")
router.register(r"leave-requests", LeaveRequestViewSet, basename="hr-leave-request")
router.register(r"timesheets", TimesheetViewSet, basename="hr-timesheet")
router.register(r"payroll-periods", PayrollPeriodViewSet, basename="hr-payroll-period")
router.register(r"payroll-runs", PayrollRunViewSet, basename="hr-payroll-run")
router.register(r"payslips", PayslipViewSet, basename="hr-payslip")

urlpatterns = [
    path("reports/labor-cost/", LaborCostReportView.as_view(), name="hr-labor-cost-report"),
    path("dashboard/", WorkforceDashboardView.as_view(), name="hr-dashboard"),
    path("", include(router.urls)),
]
