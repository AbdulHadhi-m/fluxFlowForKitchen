import { UnitOfMeasure } from "@/features/inventory/types/inventory.types";

export type POStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  inventory_item: string;
  item_name_snapshot: string;
  quantity_ordered: string;
  quantity_received: string;
  remaining_quantity: string;
  unit: UnitOfMeasure;
  unit_cost: string;
  line_total: string;
}

export interface PurchaseReceiptItem {
  id: string;
  purchase_order_item: string;
  item_name: string;
  quantity_received: string;
  unit: UnitOfMeasure;
}

export interface PurchaseReceipt {
  id: string;
  receipt_number: string;
  purchase_order: string;
  received_by_name: string;
  idempotency_key: string;
  notes: string;
  items: PurchaseReceiptItem[];
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: string;
  supplier_name: string;
  supplier_code: string;
  status: POStatus;
  status_display: string;
  order_date: string | null;
  expected_delivery_date: string | null;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  notes: string;
  created_by_name: string;
  approved_by_name: string | null;
  approved_at: string | null;
  items: PurchaseOrderItem[];
  receipts: PurchaseReceipt[];
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierPayload {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface CreatePOItemPayload {
  inventory_item_id: string;
  quantity_ordered: number;
  unit?: UnitOfMeasure;
  unit_cost?: number;
}

export interface CreatePurchaseOrderPayload {
  supplier_id: string;
  order_date?: string;
  expected_delivery_date?: string;
  tax_amount?: number;
  notes?: string;
  items: CreatePOItemPayload[];
}

export interface ReceiveGoodsPayload {
  items: {
    purchase_order_item_id: string;
    quantity: number;
  }[];
  idempotency_key?: string;
  notes?: string;
}
