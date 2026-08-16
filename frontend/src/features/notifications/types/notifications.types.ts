export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export type NotificationType =
  | "INVENTORY_LOW_STOCK"
  | "INVENTORY_OUT_OF_STOCK"
  | "PURCHASE_ORDER_PENDING"
  | "PURCHASE_ORDER_APPROVED"
  | "PURCHASE_ORDER_PARTIALLY_RECEIVED"
  | "PURCHASE_ORDER_RECEIVED"
  | "ORDER_NEW"
  | "ORDER_CANCELLED"
  | "KDS_READY"
  | "PAYMENT_COMPLETED"
  | "SYSTEM_ALERT";

export interface NotificationItem {
  id: string;
  notification_type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  action_url: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  in_app_enabled: boolean;
  realtime_enabled: boolean;
  low_stock_alerts: boolean;
  order_alerts: boolean;
  procurement_alerts: boolean;
  updated_at: string;
}
