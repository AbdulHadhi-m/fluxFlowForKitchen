import {
  ApprovalStatus,
  ConditionOperator,
  ExecutionStatus,
  StepExecutionStatus,
  StepType,
  WorkflowActionCode,
  WorkflowCategory,
  WorkflowEventType,
  WorkflowStatus,
  WorkflowTriggerType,
} from "../types/automation.types";

export const WORKFLOW_CATEGORY_LABELS: Record<WorkflowCategory, string> = {
  INVENTORY: "Inventory & Stock",
  PROCUREMENT: "Procurement & Purchasing",
  FINANCE: "Finance & Accounting",
  CUSTOMER: "Customer Experience",
  SUPPORT: "Support & Service",
  HR: "Human Resources",
  MARKETING: "Marketing & Campaigns",
  OPERATIONS: "Operations",
  PAYMENT: "Payments & Billing",
  LOYALTY: "Loyalty & Rewards",
  OTHER: "Other",
};

export const WORKFLOW_TRIGGER_LABELS: Record<WorkflowTriggerType, string> = {
  EVENT: "Event Trigger",
  SCHEDULE: "Schedule Trigger",
  MANUAL: "Manual Trigger",
  WEBHOOK: "Webhook Trigger",
};

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  ACTION: "Action",
  CONDITION: "Condition",
  APPROVAL: "Approval",
  WAIT: "Wait / Delay",
  BRANCH: "Branch",
  END: "End",
};

export const WORKFLOW_EVENT_TYPES: WorkflowEventType[] = [
  "ORDER_CREATED",
  "ORDER_COMPLETED",
  "ORDER_CANCELLED",
  "PAYMENT_COMPLETED",
  "PAYMENT_FAILED",
  "BILL_VOIDED",
  "INVOICE_OVERDUE",
  "INVENTORY_LOW",
  "INVENTORY_OUT",
  "PURCHASE_ORDER_CREATED",
  "PURCHASE_ORDER_RECEIVED",
  "CUSTOMER_CREATED",
  "CUSTOMER_FEEDBACK_SUBMITTED",
  "COMPLAINT_CREATED",
  "TICKET_CREATED",
  "TICKET_SLA_BREACHED",
  "RESERVATION_CREATED",
  "RESERVATION_CANCELLED",
  "EMPLOYEE_ABSENCE_RECORDED",
  "PAYROLL_COMPLETED",
  "CAMPAIGN_COMPLETED",
];

export const WORKFLOW_ACTIONS: Array<{
  code: WorkflowActionCode;
  name: string;
  description: string;
  fields: Array<{ key: string; label: string; type: "text" | "number" | "select"; options?: string[] }>;
}> = [
  {
    code: "SEND_NOTIFICATION",
    name: "Send In-App Notification",
    description: "Notify a specific user or all staff with a permission.",
    fields: [
      { key: "recipient_id", label: "Recipient ID", type: "text" },
      { key: "permission_code", label: "Permission Code", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "message", label: "Message", type: "text" },
      {
        key: "severity",
        label: "Severity",
        type: "select",
        options: ["INFO", "SUCCESS", "WARNING", "CRITICAL"],
      },
    ],
  },
  {
    code: "SEND_EMAIL",
    name: "Send Email",
    description: "Send an email via the configured email backend.",
    fields: [
      { key: "to", label: "To", type: "text" },
      { key: "subject", label: "Subject", type: "text" },
      { key: "body", label: "Body", type: "text" },
    ],
  },
  {
    code: "CREATE_TASK",
    name: "Create Task",
    description: "Create an internal automation follow-up task.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "priority", label: "Priority", type: "select", options: ["LOW", "NORMAL", "HIGH", "URGENT"] },
      { key: "assignee_role", label: "Assignee Role", type: "text" },
    ],
  },
  {
    code: "ASSIGN_TASK",
    name: "Assign Task",
    description: "Assign or reassign an existing automation task.",
    fields: [
      { key: "task_id", label: "Task ID", type: "text" },
      { key: "assignee_id", label: "Assignee ID", type: "text" },
    ],
  },
  {
    code: "CREATE_FOLLOW_UP",
    name: "Create Follow-up",
    description: "Schedule a follow-up task relative to the current event.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "category", label: "Category", type: "select", options: Object.keys(WORKFLOW_CATEGORY_LABELS) },
      { key: "due_days", label: "Due In Days", type: "number" },
    ],
  },
  {
    code: "CREATE_SUPPORT_TICKET",
    name: "Create Support Ticket",
    description: "Open an automated support ticket and alert responsible staff.",
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "message", label: "Message", type: "text" },
    ],
  },
  {
    code: "REQUEST_APPROVAL",
    name: "Request Approval",
    description: "Create a human approval gate using existing RBAC.",
    fields: [
      { key: "approver_role", label: "Approver Role", type: "text" },
      { key: "approver_id", label: "Approver ID", type: "text" },
      { key: "reason", label: "Reason", type: "text" },
      { key: "amount", label: "Amount", type: "text" },
      { key: "expiry_hours", label: "Expiry Hours", type: "number" },
    ],
  },
  {
    code: "CREATE_PURCHASE_REQUEST",
    name: "Create Purchase Requisition",
    description: "Create a purchase requisition via the procurement service.",
    fields: [
      { key: "items", label: "Items (JSON)", type: "text" },
      { key: "reason", label: "Reason", type: "text" },
    ],
  },
  {
    code: "CREATE_DRAFT_PURCHASE_ORDER",
    name: "Create Draft Purchase Order",
    description: "Create a draft purchase order via the procurement service.",
    fields: [
      { key: "supplier_id", label: "Supplier ID", type: "text" },
      { key: "items", label: "Items (JSON)", type: "text" },
    ],
  },
  {
    code: "ADD_LOYALTY_POINTS",
    name: "Add Loyalty Points",
    description: "Award loyalty points via the loyalty service (idempotent per order).",
    fields: [
      { key: "spend_amount", label: "Spend Amount", type: "text" },
      { key: "customer_id", label: "Customer ID", type: "text" },
    ],
  },
  {
    code: "CREATE_COUPON",
    name: "Create Coupon",
    description: "Generate a coupon code for an existing promotion.",
    fields: [
      { key: "promotion_id", label: "Promotion ID", type: "text" },
      { key: "prefix", label: "Prefix", type: "text" },
    ],
  },
  {
    code: "ESCALATE",
    name: "Escalate",
    description: "Escalate to staff holding a permission and create an urgent task.",
    fields: [
      { key: "permission_code", label: "Permission Code", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "message", label: "Message", type: "text" },
    ],
  },
  {
    code: "WEBHOOK",
    name: "Outbound Webhook",
    description: "POST safe payload to an approved external endpoint.",
    fields: [
      { key: "credential_reference", label: "Credential Reference Key", type: "text" },
      { key: "payload_template", label: "Payload Template (JSON)", type: "text" },
    ],
  },
];

export const CONDITION_OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
  { value: "EQUALS", label: "Equals" },
  { value: "NOT_EQUALS", label: "Not Equals" },
  { value: "GREATER_THAN", label: "Greater Than" },
  { value: "GREATER_THAN_OR_EQUAL", label: "Greater Than Or Equal" },
  { value: "LESS_THAN", label: "Less Than" },
  { value: "LESS_THAN_OR_EQUAL", label: "Less Than Or Equal" },
  { value: "IN", label: "In" },
  { value: "NOT_IN", label: "Not In" },
  { value: "CONTAINS", label: "Contains" },
  { value: "NOT_CONTAINS", label: "Not Contains" },
  { value: "IS_EMPTY", label: "Is Empty" },
  { value: "IS_NOT_EMPTY", label: "Is Not Empty" },
  { value: "BETWEEN", label: "Between" },
];

export const CONDITION_FIELD_SUGGESTIONS = [
  "payload.total_amount",
  "payload.discount_amount",
  "payload.refund_amount",
  "payload.item_id",
  "payload.customer_id",
  "payload.status",
  "event.event_type",
  "event.entity_type",
  "order.status",
  "order.total_amount",
  "inventory_item.quantity_on_hand",
  "inventory_item.par_level",
  "customer.total_spend",
  "invoice.balance_due",
  "purchase_order.status",
  "business_hours",
  "now.time",
  "now.day_of_week",
  "now.date",
];

export const WORKFLOW_STATUS_STYLES: Record<WorkflowStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DRAFT: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  PAUSED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ARCHIVED: "bg-zinc-800 text-zinc-500 border-zinc-700",
};

export const EXECUTION_STATUS_STYLES: Record<ExecutionStatus, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  RUNNING: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  PENDING: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  WAITING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVAL_REQUIRED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  FAILED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  CANCELLED: "bg-zinc-800 text-zinc-500 border-zinc-700",
  PAUSED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export const STEP_EXECUTION_STATUS_STYLES: Record<StepExecutionStatus, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  RUNNING: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  PENDING: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  SKIPPED: "bg-zinc-800 text-zinc-500 border-zinc-700",
  FAILED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  WAITING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export const APPROVAL_STATUS_STYLES: Record<ApprovalStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  EXPIRED: "bg-zinc-800 text-zinc-500 border-zinc-700",
  CANCELLED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};