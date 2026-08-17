import { apiClient } from "@/lib/api-client";
import {
  Department,
  Position,
  EmployeeDetail,
  AttendanceSession,
  AttendanceCorrection,
  Shift,
  ShiftSchedule,
  ShiftSwapRequest,
  EmployeeAvailability,
  LeaveType,
  LeaveAllocation,
  LeaveRequest,
  Timesheet,
  PayrollPeriod,
  PayrollRun,
  PayrollItem,
  WorkforceSummary,
  LaborCostReport,
} from "../types/hr.types";

export const hrApi = {
  // 1. Organization
  getDepartments: async (): Promise<Department[]> => {
    const res = await apiClient.get<Department[]>("/hr/departments/");
    return res.data;
  },
  createDepartment: async (data: Partial<Department>): Promise<Department> => {
    const res = await apiClient.post<Department>("/hr/departments/", data);
    return res.data;
  },
  getPositions: async (): Promise<Position[]> => {
    const res = await apiClient.get<Position[]>("/hr/positions/");
    return res.data;
  },
  createPosition: async (data: Partial<Position>): Promise<Position> => {
    const res = await apiClient.post<Position>("/hr/positions/", data);
    return res.data;
  },

  // 2. Employees & Lifecycles
  getEmployees: async (): Promise<EmployeeDetail[]> => {
    const res = await apiClient.get<EmployeeDetail[]>("/hr/employees/");
    return res.data;
  },
  getEmployeeDetail: async (id: string): Promise<EmployeeDetail> => {
    const res = await apiClient.get<EmployeeDetail>(`/hr/employees/${id}/`);
    return res.data;
  },
  updateEmployeeDetail: async (id: string, data: Partial<EmployeeDetail>): Promise<EmployeeDetail> => {
    const res = await apiClient.patch<EmployeeDetail>(`/hr/employees/${id}/`, data);
    return res.data;
  },

  // 3. Attendance & Breaks
  getAttendanceSessions: async (params?: { date?: string; staff_profile?: string }): Promise<AttendanceSession[]> => {
    const res = await apiClient.get<AttendanceSession[]>("/hr/attendance/", { params });
    return res.data;
  },
  clockIn: async (payload: { staff_profile_id?: string; notes?: string }): Promise<AttendanceSession> => {
    const res = await apiClient.post<AttendanceSession>("/hr/attendance/clock-in/", payload);
    return res.data;
  },
  clockOut: async (payload: { staff_profile_id?: string; notes?: string }): Promise<AttendanceSession> => {
    const res = await apiClient.post<AttendanceSession>("/hr/attendance/clock-out/", payload);
    return res.data;
  },
  startBreak: async (sessionId: string, payload: { break_type?: string; is_paid?: boolean }): Promise<{ message: string; break_id: string }> => {
    const res = await apiClient.post<{ message: string; break_id: string }>(`/hr/attendance/${sessionId}/start-break/`, payload);
    return res.data;
  },
  endBreak: async (sessionId: string): Promise<{ message: string; duration_minutes: number }> => {
    const res = await apiClient.post<{ message: string; duration_minutes: number }>(`/hr/attendance/${sessionId}/end-break/`);
    return res.data;
  },
  requestAttendanceCorrection: async (sessionId: string, payload: { requested_clock_in: string; requested_clock_out: string; reason: string }): Promise<AttendanceCorrection> => {
    const res = await apiClient.post<AttendanceCorrection>(`/hr/attendance/${sessionId}/correction/`, payload);
    return res.data;
  },
  getAttendanceCorrections: async (): Promise<AttendanceCorrection[]> => {
    const res = await apiClient.get<AttendanceCorrection[]>("/hr/attendance-corrections/");
    return res.data;
  },
  approveAttendanceCorrection: async (correctionId: string, reviewNotes?: string): Promise<AttendanceCorrection> => {
    const res = await apiClient.post<AttendanceCorrection>(`/hr/attendance-corrections/${correctionId}/approve/`, { review_notes: reviewNotes });
    return res.data;
  },
  rejectAttendanceCorrection: async (correctionId: string, reviewNotes?: string): Promise<AttendanceCorrection> => {
    const res = await apiClient.post<AttendanceCorrection>(`/hr/attendance-corrections/${correctionId}/reject/`, { review_notes: reviewNotes });
    return res.data;
  },

  // 4. Shifts & Scheduling
  getShifts: async (): Promise<Shift[]> => {
    const res = await apiClient.get<Shift[]>("/hr/shifts/");
    return res.data;
  },
  createShift: async (data: Partial<Shift>): Promise<Shift> => {
    const res = await apiClient.post<Shift>("/hr/shifts/", data);
    return res.data;
  },
  getSchedules: async (params?: { shift_date?: string }): Promise<ShiftSchedule[]> => {
    const res = await apiClient.get<ShiftSchedule[]>("/hr/schedules/", { params });
    return res.data;
  },
  createSchedule: async (data: { staff_profile: string; shift: string; shift_date: string; notes?: string }): Promise<ShiftSchedule> => {
    const res = await apiClient.post<ShiftSchedule>("/hr/schedules/", data);
    return res.data;
  },
  getShiftSwaps: async (): Promise<ShiftSwapRequest[]> => {
    const res = await apiClient.get<ShiftSwapRequest[]>("/hr/shift-swaps/");
    return res.data;
  },
  requestShiftSwap: async (data: { requester_shift: string; target_employee: string; target_shift?: string; notes?: string }): Promise<ShiftSwapRequest> => {
    const res = await apiClient.post<ShiftSwapRequest>("/hr/shift-swaps/", data);
    return res.data;
  },
  approveShiftSwap: async (id: string): Promise<ShiftSwapRequest> => {
    const res = await apiClient.post<ShiftSwapRequest>(`/hr/shift-swaps/${id}/approve/`);
    return res.data;
  },
  getAvailabilities: async (): Promise<EmployeeAvailability[]> => {
    const res = await apiClient.get<EmployeeAvailability[]>("/hr/availability/");
    return res.data;
  },
  saveAvailability: async (data: Partial<EmployeeAvailability>): Promise<EmployeeAvailability> => {
    const res = await apiClient.post<EmployeeAvailability>("/hr/availability/", data);
    return res.data;
  },

  // 5. Leave Management
  getLeaveTypes: async (): Promise<LeaveType[]> => {
    const res = await apiClient.get<LeaveType[]>("/hr/leave-types/");
    return res.data;
  },
  getLeaveAllocations: async (): Promise<LeaveAllocation[]> => {
    const res = await apiClient.get<LeaveAllocation[]>("/hr/leave-allocations/");
    return res.data;
  },
  getLeaveRequests: async (): Promise<LeaveRequest[]> => {
    const res = await apiClient.get<LeaveRequest[]>("/hr/leave-requests/");
    return res.data;
  },
  requestLeave: async (data: { staff_profile?: string; leave_type: string; start_date: string; end_date: string; reason: string }): Promise<LeaveRequest> => {
    const res = await apiClient.post<LeaveRequest>("/hr/leave-requests/", data);
    return res.data;
  },
  approveLeave: async (id: string): Promise<LeaveRequest> => {
    const res = await apiClient.post<LeaveRequest>(`/hr/leave-requests/${id}/approve/`);
    return res.data;
  },
  rejectLeave: async (id: string, reason?: string): Promise<LeaveRequest> => {
    const res = await apiClient.post<LeaveRequest>(`/hr/leave-requests/${id}/reject/`, { rejection_reason: reason });
    return res.data;
  },

  // 6. Timesheets
  getTimesheets: async (): Promise<Timesheet[]> => {
    const res = await apiClient.get<Timesheet[]>("/hr/timesheets/");
    return res.data;
  },
  approveTimesheet: async (id: string): Promise<Timesheet> => {
    const res = await apiClient.post<Timesheet>(`/hr/timesheets/${id}/approve/`);
    return res.data;
  },

  // 7. Payroll Engine
  getPayrollPeriods: async (): Promise<PayrollPeriod[]> => {
    const res = await apiClient.get<PayrollPeriod[]>("/hr/payroll-periods/");
    return res.data;
  },
  createPayrollPeriod: async (data: Partial<PayrollPeriod>): Promise<PayrollPeriod> => {
    const res = await apiClient.post<PayrollPeriod>("/hr/payroll-periods/", data);
    return res.data;
  },
  getPayrollRuns: async (): Promise<PayrollRun[]> => {
    const res = await apiClient.get<PayrollRun[]>("/hr/payroll-runs/");
    return res.data;
  },
  getPayrollRunDetail: async (id: string): Promise<PayrollRun> => {
    const res = await apiClient.get<PayrollRun>(`/hr/payroll-runs/${id}/`);
    return res.data;
  },
  createPayrollRun: async (data: { payroll_period: string; run_number: string; notes?: string }): Promise<PayrollRun> => {
    const res = await apiClient.post<PayrollRun>("/hr/payroll-runs/", data);
    return res.data;
  },
  calculatePayrollRun: async (id: string): Promise<PayrollRun> => {
    const res = await apiClient.post<PayrollRun>(`/hr/payroll-runs/${id}/calculate/`);
    return res.data;
  },
  approvePayrollRun: async (id: string): Promise<PayrollRun> => {
    const res = await apiClient.post<PayrollRun>(`/hr/payroll-runs/${id}/approve/`);
    return res.data;
  },
  processPayrollRun: async (id: string): Promise<PayrollRun> => {
    const res = await apiClient.post<PayrollRun>(`/hr/payroll-runs/${id}/process/`);
    return res.data;
  },
  getPayslips: async (): Promise<PayrollItem[]> => {
    const res = await apiClient.get<PayrollItem[]>("/hr/payslips/");
    return res.data;
  },

  // 8. Analytics & Dashboard Summary
  getDashboardSummary: async (): Promise<WorkforceSummary> => {
    const res = await apiClient.get<WorkforceSummary>("/hr/dashboard/");
    return res.data;
  },
  getLaborCostReport: async (params?: { start_date?: string; end_date?: string }): Promise<LaborCostReport> => {
    const res = await apiClient.get<LaborCostReport>("/hr/reports/labor-cost/", { params });
    return res.data;
  },
};
