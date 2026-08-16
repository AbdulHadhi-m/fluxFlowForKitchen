export type OrderStatus = "DRAFT" | "PLACED" | "COMPLETED" | "CANCELLED";

export interface OrderItem {
  id: string;
  menu_item: string | null;
  item_name_snapshot: string;
  unit_price_snapshot: string;
  quantity: number;
  line_total: string;
  notes: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  table: string | null;
  table_name: string | null;
  created_by: string;
  created_by_name: string;
  status: OrderStatus;
  status_display: string;
  notes: string;
  subtotal: string;
  total: string;
  is_editable: boolean;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  notes?: string;
}

export interface OrderCreatePayload {
  table_id?: string | null;
  notes?: string;
  status?: "DRAFT" | "PLACED";
  items: OrderItemInput[];
}

export interface PosCartItem {
  menu_item_id: string;
  name: string;
  price: string;
  quantity: number;
  notes: string;
}
