export type KitchenStatus = "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

export interface KitchenTicketItem {
  id: string;
  name: string;
  quantity: number;
  notes: string;
}

export interface KitchenTicket {
  id: string;
  order_id: string;
  order_number: string;
  table_name: string | null;
  server_name: string;
  status: KitchenStatus;
  status_display: string;
  priority: number;
  notes: string;
  items: KitchenTicketItem[];
  started_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type WsConnectionStatus = "CONNECTED" | "RECONNECTING" | "OFFLINE";

export interface KitchenWsEvent {
  type: string;
  event_type: "KITCHEN_ORDER_CREATED" | "KITCHEN_STATUS_CHANGED" | "KITCHEN_ORDER_CANCELLED";
  data: any;
  timestamp: string;
}
