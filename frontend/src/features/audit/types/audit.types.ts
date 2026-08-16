export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGED"
  | "ROLE_CHANGED"
  | "PERMISSION_CHANGED"
  | "STATUS_CHANGED"
  | "APPROVED"
  | "CANCELLED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "STOCK_ADJUSTED"
  | "STOCK_RECEIVED"
  | "STOCK_WASTED"
  | "EXPORT";

export type AuditEntityType =
  | "USER"
  | "STAFF"
  | "RESTAURANT"
  | "ROLE"
  | "MENU_ITEM"
  | "MENU_CATEGORY"
  | "TABLE"
  | "ORDER"
  | "BILL"
  | "PAYMENT"
  | "INVENTORY_ITEM"
  | "STOCK_MOVEMENT"
  | "SUPPLIER"
  | "PURCHASE_ORDER"
  | "NOTIFICATION"
  | "REPORT";

export interface AuditLogItem {
  id: string;
  actor_email: string;
  actor_role: string;
  actor_type: "USER" | "SYSTEM";
  action: AuditAction;
  action_display: string;
  entity_type: AuditEntityType;
  entity_type_display: string;
  entity_id: string;
  description: string;
  before_data: Record<string, any>;
  after_data: Record<string, any>;
  metadata: Record<string, any>;
  ip_address: string;
  user_agent: string;
  correlation_id: string;
  created_at: string;
}
