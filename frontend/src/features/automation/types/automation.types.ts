export type WorkflowCategory =
  | "INVENTORY"
  | "PROCUREMENT"
  | "FINANCE"
  | "CUSTOMER"
  | "SUPPORT"
  | "HR"
  | "MARKETING"
  | "OPERATIONS"
  | "PAYMENT"
  | "LOYALTY"
  | "OTHER";

export type WorkflowStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export type WorkflowTriggerType = "EVENT" | "SCHEDULE" | "MANUAL" | "WEBHOOK";

export type WorkflowScope = "GLOBAL" | "RESTAURANT";

export type StepType = "ACTION" | "CONDITION" | "APPROVAL" | "WAIT" | "BRANCH" | "END";

export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "WAITING"
  | "APPROVAL_REQUIRED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "PAUSED";

export type StepExecutionStatus = "PENDING" | "RUNNING" | "COMPLETED" | "SKIPPED" | "FAILED" | "WAITING";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";

export type TriggerRecordType = "EVENT" | "SCHEDULE" | "MANUAL" | "WEBHOOK";

export type WorkflowEventType =
  | "ORDER_CREATED"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "BILL_VOIDED"
  | "INVOICE_OVERDUE"
  | "INVENTORY_LOW"
  | "INVENTORY_OUT"
  | "PURCHASE_ORDER_CREATED"
  | "PURCHASE_ORDER_RECEIVED"
  | "CUSTOMER_CREATED"
  | "CUSTOMER_FEEDBACK_SUBMITTED"
  | "COMPLAINT_CREATED"
  | "TICKET_CREATED"
  | "TICKET_SLA_BREACHED"
  | "RESERVATION_CREATED"
  | "RESERVATION_CANCELLED"
  | "EMPLOYEE_ABSENCE_RECORDED"
  | "PAYROLL_COMPLETED"
  | "CAMPAIGN_COMPLETED";

export type WorkflowActionCode =
  | "SEND_NOTIFICATION"
  | "SEND_EMAIL"
  | "CREATE_TASK"
  | "ASSIGN_TASK"
  | "CREATE_FOLLOW_UP"
  | "CREATE_SUPPORT_TICKET"
  | "REQUEST_APPROVAL"
  | "CREATE_PURCHASE_REQUEST"
  | "CREATE_DRAFT_PURCHASE_ORDER"
  | "ADD_LOYALTY_POINTS"
  | "CREATE_COUPON"
  | "ESCALATE"
  | "WEBHOOK";

export type ConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "IN"
  | "NOT_IN"
  | "CONTAINS"
  | "NOT_CONTAINS"
  | "IS_EMPTY"
  | "IS_NOT_EMPTY"
  | "BETWEEN";

export interface WorkflowStep {
  code: string;
  name: string;
  type: StepType;
  config: Record<string, any>;
  next?: string;
  on_true?: string;
  on_false?: string;
}

export interface Workflow {
  id: string;
  name: string;
  code: string;
  description: string;
  category: WorkflowCategory;
  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, any>;
  status: WorkflowStatus;
  scope: WorkflowScope;
  restaurant: string | null;
  branch_id: string | null;
  conditions: Record<string, any>;
  active_version: string | null;
  active_version_number: number | null;
  version_count: number;
  timeout_minutes: number;
  max_steps: number;
  max_retries: number;
  max_nested_depth: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  steps?: WorkflowStep[];
  restaurant_name: string;
  created_by_name: string;
  updated_by_name: string;
  execution_count: number;
}

export interface WorkflowVersion {
  id: string;
  workflow: string;
  version_number: number;
  definition: {
    steps?: WorkflowStep[];
    conditions?: Record<string, any>;
  };
  status: "DRAFT" | "PUBLISHED" | "SUPERSEDED";
  changelog: string;
  published_by: string | null;
  published_by_name: string;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepExecution {
  id: string;
  execution: string;
  step_code: string;
  step_name: string;
  step_type: StepType;
  status: StepExecutionStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  retry_count: number;
  error: Record<string, any>;
  output: Record<string, any>;
  created_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow: string;
  workflow_name: string;
  workflow_code: string;
  version: string;
  version_number: number;
  restaurant: string;
  restaurant_name: string;
  status: ExecutionStatus;
  trigger: TriggerRecordType;
  event_id: string;
  input: Record<string, any>;
  output: Record<string, any>;
  error: Record<string, any>;
  started_at: string | null;
  completed_at: string | null;
  current_step_code: string;
  attempt_count: number;
  scheduled_at: string | null;
  resume_at: string | null;
  is_paused: boolean;
  parent_execution: string | null;
  depth: number;
  triggered_by: string | null;
  triggered_by_name: string;
  created_at: string;
  updated_at: string;
  step_executions: WorkflowStepExecution[];
}

export interface WorkflowApprovalRequest {
  id: string;
  execution: string;
  workflow_name: string;
  workflow_code: string;
  execution_status: ExecutionStatus;
  step_code: string;
  requested_by: string | null;
  requested_by_name: string;
  approver: string | null;
  approver_name: string;
  approver_role: string;
  reason: string;
  amount: string;
  entity_type: string;
  entity_id: string;
  related_data: Record<string, any>;
  status: ApprovalStatus;
  expires_at: string | null;
  responded_at: string | null;
  responded_by: string | null;
  responded_by_name: string;
  response_note: string;
  escalation_count: number;
  escalated_at: string | null;
  created_at: string;
  updated_at: string;
  restaurant_id: string;
}

export interface WorkflowEventLog {
  id: string;
  event_id: string;
  event_type: WorkflowEventType;
  event_version: number;
  restaurant: string;
  restaurant_name: string;
  entity_type: string;
  entity_id: string;
  occurred_at: string;
  processed_at: string | null;
  created_at: string;
}

export interface WorkflowTask {
  id: string;
  restaurant: string;
  title: string;
  description: string;
  category: WorkflowCategory;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  assignee: string | null;
  assignee_name: string;
  assignee_role: string;
  due_at: string | null;
  execution: string | null;
  entity_type: string;
  entity_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplate {
  code: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, any>;
  steps: WorkflowStep[];
  conditions: Record<string, any>;
}

export interface WorkflowWebhookCredential {
  id: string;
  restaurant: string;
  name: string;
  reference_key: string;
  endpoint_url: string;
  auth_type: "NONE" | "BEARER" | "BASIC" | "HMAC";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationAnalyticsOverview {
  active_workflows: number;
  paused_workflows: number;
  executions_total: number;
  executions_today: number;
  completed_today: number;
  failed_today: number;
  successful: number;
  failed: number;
  waiting: number;
  cancelled: number;
  success_rate: number;
  failure_rate: number;
  avg_duration_seconds: number | null;
  retry_count: number;
  pending_approvals: number;
  scheduled_runs: number;
  escalations: number;
  most_used_workflows: Array<{ name: string; code: string; executions: number }>;
  action_failures: Array<{ step_code: string; failures: number }>;
  daily: Array<{ day: string; total: number; completed: number; failed: number }>;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}

export interface WorkflowPayload {
  name: string;
  code: string;
  description?: string;
  category?: WorkflowCategory;
  trigger_type?: WorkflowTriggerType;
  trigger_config?: Record<string, any>;
  scope?: WorkflowScope;
  conditions?: Record<string, any>;
  steps?: WorkflowStep[];
  timeout_minutes?: number;
  max_steps?: number;
  max_retries?: number;
  max_nested_depth?: number;
}