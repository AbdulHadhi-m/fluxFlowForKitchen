export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  manager: string | null;
  manager_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  department: string | null;
  department_name?: string;
  title: string;
  code: string;
  description: string;
  min_pay: string;
  max_pay: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY" | "INTERN" | "OTHER";
export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED" | "RESIGNED" | "INACTIVE";

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  is_primary: boolean;
}

export interface EmployeeDocument {
  id: string;
  document_type: string;
  document_type_display?: string;
  document_number: string;
  issue_date: string | null;
  expiry_date: string | null;
  verification_status: "PENDING" | "VERIFIED" | "EXPIRED" | "REJECTED";
  verification_status_display?: string;
  notes: string;
  created_at: string;
}

export interface Compensation {
  id: string;
  pay_type: "SALARY" | "HOURLY" | "DAILY" | "CONTRACT";
  pay_type_display?: string;
  base_rate: string;
  overtime_rate_multiplier: string;
  currency: string;
  effective_date: string;
  is_active: boolean;
  notes: string;
}

export interface EmployeeDetail {
  id: string;
  staff_profile: string;
  staff_display_name?: string;
  staff_email?: string;
  staff_employee_id?: string;
  department: string | null;
  department_name?: string;
  position: string | null;
  position_title?: string;
  manager: string | null;
  manager_name?: string;
  employment_type: EmploymentType;
  employment_status: EmploymentStatus;
  joining_date: string;
  termination_date: string | null;
  termination_reason: string;
  onboarding_checklist: Record<string, boolean>;
  notes: string;
  emergency_contacts?: EmergencyContact[];
  documents?: EmployeeDocument[];
  compensations?: Compensation[];
  created_at: string;
  updated_at: string;
}

export interface AttendanceBreak {
  id: string;
  break_type: "LUNCH" | "REST" | "TEA" | "OTHER";
  break_type_display?: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  is_paid: boolean;
}

export interface AttendanceSession {
  id: string;
  staff_profile: string;
  employee_name?: string;
  employee_id_code?: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  total_break_minutes: number;
  worked_hours: string;
  regular_hours: string;
  overtime_hours: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE" | "HOLIDAY" | "REST_DAY" | "PENDING_REVIEW";
  is_approved: boolean;
  notes: string;
  breaks?: AttendanceBreak[];
  created_at: string;
  updated_at: string;
}

export interface AttendanceCorrection {
  id: string;
  attendance_session: string;
  requested_by: string;
  requested_by_name?: string;
  requested_clock_in: string;
  requested_clock_out: string;
  reason: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  reviewed_by?: string | null;
  reviewed_by_name?: string;
  reviewed_at?: string | null;
  review_notes?: string;
  created_at: string;
}

export interface Shift {
  id: string;
  name: string;
  shift_type: "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | "SPLIT";
  start_time: string;
  end_time: string;
  unpaid_break_minutes: number;
  department: string | null;
  department_name?: string;
  position: string | null;
  position_title?: string;
  is_active: boolean;
}

export interface ShiftSchedule {
  id: string;
  staff_profile: string;
  employee_name?: string;
  shift: string;
  shift_name?: string;
  shift_start_time?: string;
  shift_end_time?: string;
  shift_date: string;
  department: string | null;
  department_name?: string;
  position: string | null;
  status: "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "CANCELLED";
  notes: string;
  created_at: string;
}

export interface ShiftSwapRequest {
  id: string;
  requester_shift: string;
  target_shift: string | null;
  requester: string;
  requester_name?: string;
  target_employee: string;
  target_name?: string;
  status: "PENDING_TARGET" | "PENDING_MANAGER" | "APPROVED" | "REJECTED" | "CANCELLED";
  notes: string;
  created_at: string;
}

export interface EmployeeAvailability {
  id: string;
  staff_profile: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  notes: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: "ANNUAL" | "SICK" | "UNPAID" | "EMERGENCY" | "MATERNITY" | "OTHER";
  is_paid: boolean;
  default_days_per_year: string;
}

export interface LeaveAllocation {
  id: string;
  staff_profile: string;
  leave_type: string;
  leave_type_name?: string;
  year: number;
  allocated_days: string;
  used_days: string;
  pending_days: string;
  remaining_days: string;
}

export interface LeaveRequest {
  id: string;
  staff_profile: string;
  employee_name?: string;
  leave_type: string;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  days_count: string;
  reason: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  approved_by?: string | null;
  approved_by_name?: string;
  approved_at?: string | null;
  rejection_reason?: string;
  created_at: string;
}

export interface Timesheet {
  id: string;
  staff_profile: string;
  employee_name?: string;
  period_start: string;
  period_end: string;
  regular_hours: string;
  overtime_hours: string;
  leave_hours: string;
  holiday_hours: string;
  total_hours: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "LOCKED";
  approved_by?: string | null;
  approved_by_name?: string;
  approved_at?: string | null;
  notes: string;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM";
  start_date: string;
  end_date: string;
  status: "DRAFT" | "CALCULATING" | "PENDING_REVIEW" | "APPROVED" | "PROCESSED" | "CANCELLED";
  closed_at: string | null;
  created_at: string;
}

export interface PayrollComponentDetail {
  id: string;
  component_type: "ALLOWANCE" | "BONUS" | "DEDUCTION" | "TAX";
  name: string;
  amount: string;
  is_taxable: boolean;
}

export interface PayrollItem {
  id: string;
  payroll_run: string;
  staff_profile: string;
  employee_name?: string;
  employee_id_code?: string;
  base_pay: string;
  worked_hours: string;
  overtime_hours: string;
  regular_earnings: string;
  overtime_pay: string;
  allowances_total: string;
  bonuses_total: string;
  deductions_total: string;
  tax_deduction: string;
  gross_pay: string;
  net_pay: string;
  status: "PENDING" | "APPROVED" | "PAID";
  components?: PayrollComponentDetail[];
}

export interface PayrollRun {
  id: string;
  payroll_period: string;
  period_name?: string;
  period_start?: string;
  period_end?: string;
  run_number: string;
  status: "DRAFT" | "CALCULATING" | "PENDING_REVIEW" | "APPROVED" | "PROCESSED" | "CANCELLED";
  total_gross_pay: string;
  total_deductions: string;
  total_allowances: string;
  total_bonuses: string;
  total_net_pay: string;
  total_employer_cost: string;
  calculated_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  journal_entry?: string | null;
  journal_entry_number?: string;
  notes: string;
  items?: PayrollItem[];
  created_at: string;
}

export interface WorkforceSummary {
  total_employees: number;
  clocked_in_now: number;
  scheduled_today: number;
  on_leave_today: number;
  pending_leave_approvals: number;
  pending_attendance_corrections: number;
  open_payroll_runs: number;
}

export interface LaborCostReport {
  period: { start_date: string | null; end_date: string | null };
  gross_payroll: string;
  net_payroll: string;
  overtime_cost: string;
  total_labor_hours: string;
  net_revenue: string;
  labor_cost_percentage: string;
  sales_per_labor_hour: string;
}
