import { UnitOfMeasure, StorageLocation } from "@/features/inventory/types/inventory.types";

export type SupplierType =
  | "PRIMARY_WHOLESALER"
  | "LOCAL_PRODUCE"
  | "SPECIALTY_IMPORTER"
  | "BEVERAGE_DISTRIBUTOR"
  | "PACKAGING_SUPPLIER"
  | "OTHER";

export type PaymentTerms =
  | "IMMEDIATE"
  | "NET_7"
  | "NET_15"
  | "NET_30"
  | "NET_60"
  | "COD"
  | "PREPAID";

export interface SupplierContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export interface SupplierItem {
  id: string;
  supplier: string;
  supplier_name: string;
  inventory_item: string;
  inventory_item_name: string;
  inventory_item_sku: string;
  inventory_item_unit: UnitOfMeasure;
  supplier_sku: string;
  purchase_unit: UnitOfMeasure;
  conversion_factor: string;
  unit_cost: string;
  minimum_order_quantity: string;
  pack_size: string;
  lead_time_days: number;
  is_preferred: boolean;
  is_active: boolean;
  created_at: string;
}

export interface SupplierPriceHistory {
  id: string;
  supplier: string;
  inventory_item: string;
  inventory_item_name: string;
  previous_price: string;
  new_price: string;
  effective_date: string;
  currency: string;
  unit: string;
  changed_by_name: string;
  reason: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  supplier_type: SupplierType;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  payment_terms: PaymentTerms;
  currency: string;
  lead_time_days: number;
  minimum_order_value: string;
  notes: string;
  is_active: boolean;
  contacts?: SupplierContact[];
  supplied_items_count: number;
  open_orders_count: number;
  created_at: string;
  updated_at: string;
}

export type RequisitionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "CONVERTED_TO_PO";

export type RequisitionPriority = "LOW" | "NORMAL" | "URGENT" | "EMERGENCY";

export interface PurchaseRequisitionItem {
  id: string;
  inventory_item: string;
  item_name: string;
  sku: string;
  quantity: string;
  unit: UnitOfMeasure;
  estimated_unit_cost: string;
  notes: string;
}

export interface PurchaseRequisition {
  id: string;
  requisition_number: string;
  requester: string;
  requester_name: string;
  location: StorageLocation;
  required_date: string | null;
  priority: RequisitionPriority;
  status: RequisitionStatus;
  reason: string;
  notes: string;
  items: PurchaseRequisitionItem[];
  reviewed_by_name: string;
  reviewed_at: string | null;
  converted_po: string | null;
  created_at: string;
  updated_at: string;
}

export type POStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SENT"
  | "ACKNOWLEDGED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED"
  | "CLOSED";

export type AcknowledgementStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PARTIALLY_ACCEPTED"
  | "REJECTED"
  | "DELIVERY_DATE_CHANGED";

export interface PurchaseOrderItem {
  id: string;
  inventory_item: string;
  item_name_snapshot: string;
  inventory_item_sku: string;
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
  quantity_accepted: string;
  quantity_rejected: string;
  rejection_reason: string;
  batch_number: string;
  expiry_date: string | null;
  unit_cost_actual: string;
  unit: UnitOfMeasure;
}

export interface PurchaseReceipt {
  id: string;
  receipt_number: string;
  purchase_order: {
    id: string;
    po_number: string;
    status: POStatus;
    status_display: string;
    total_amount: string;
  };
  invoice_number: string;
  delivery_note_number: string;
  storage_location: StorageLocation;
  received_by_name: string;
  idempotency_key: string;
  notes: string;
  items: PurchaseReceiptItem[];
  created_at: string;
}

export interface PurchaseOrderVersion {
  id: string;
  version_number: number;
  snapshot_data: any;
  change_reason: string;
  created_by_name: string;
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
  version: number;
  location: StorageLocation;
  currency: string;
  payment_terms: PaymentTerms;
  order_date: string | null;
  expected_delivery_date: string | null;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  acknowledgement_status: AcknowledgementStatus;
  acknowledged_at: string | null;
  supplier_notes: string;
  notes: string;
  created_by_name: string;
  approved_by_name: string | null;
  approved_at: string | null;
  sent_by_name: string | null;
  sent_at: string | null;
  items: PurchaseOrderItem[];
  receipts: PurchaseReceipt[];
  revisions: PurchaseOrderVersion[];
  created_at: string;
  updated_at: string;
}

export type ReturnStatus = "REQUESTED" | "APPROVED" | "DISPATCHED" | "COMPLETED" | "REJECTED";
export type ReturnReason = "DAMAGED" | "WRONG_ITEM" | "EXPIRED" | "QUALITY_ISSUE" | "OVER_DELIVERY" | "OTHER";

export interface PurchaseReturnItem {
  id: string;
  inventory_item: string;
  item_name: string;
  quantity: string;
  unit: UnitOfMeasure;
  unit_cost: string;
  line_total: string;
  notes: string;
}

export interface PurchaseReturn {
  id: string;
  return_number: string;
  supplier: string;
  supplier_name: string;
  purchase_receipt: string | null;
  status: ReturnStatus;
  reason: ReturnReason;
  total_credit_amount: string;
  requested_by_name: string;
  approved_by_name: string | null;
  notes: string;
  items: PurchaseReturnItem[];
  created_at: string;
}

export type CreditStatus = "PENDING" | "APPLIED" | "REFUNDED" | "CANCELLED";

export interface SupplierCredit {
  id: string;
  supplier: string;
  supplier_name: string;
  credit_note_number: string;
  amount: string;
  currency: string;
  status: CreditStatus;
  related_return: string | null;
  related_po: string | null;
  reason: string;
  issued_date: string;
  notes: string;
  created_at: string;
}

export type MatchStatus = "UNMATCHED" | "MATCHED" | "PARTIAL_MATCH" | "VARIANCE" | "REQUIRES_REVIEW" | "REJECTED";

export interface SupplierInvoiceItem {
  id: string;
  inventory_item: string | null;
  item_name: string;
  quantity_invoiced: string;
  unit_price: string;
  tax_amount: string;
  line_total: string;
}

export interface SupplierInvoice {
  id: string;
  supplier: string;
  supplier_name: string;
  purchase_order: string | null;
  po_number: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  match_status: MatchStatus;
  quantity_variance: string;
  price_variance: string;
  tax_variance: string;
  total_variance: string;
  notes: string;
  items: SupplierInvoiceItem[];
  created_at: string;
}

export type PeriodType = "MONTHLY" | "QUARTERLY" | "YEARLY" | "CUSTOM";

export interface ProcurementBudget {
  id: string;
  name: string;
  location: StorageLocation;
  department: string;
  category: string;
  period_type: PeriodType;
  start_date: string;
  end_date: string;
  allocated_amount: string;
  committed_amount: string;
  actual_spent_amount: string;
  remaining_budget: string;
  utilization_percentage: string;
  currency: string;
  notes: string;
  created_at: string;
}

export interface PurchaseRecommendation {
  inventory_item_id: string;
  item_name: string;
  sku: string;
  unit: UnitOfMeasure;
  current_stock: string;
  par_level: string;
  minimum_stock: string;
  inbound_quantity: string;
  suggested_quantity: string;
  unit_cost: string;
  estimated_total_cost: string;
  preferred_supplier_id: string | null;
  preferred_supplier_name: string;
  moq: string;
  pack_size: string;
  lead_time_days: number;
  recommendation_reason: string;
}

export interface SupplierScorecard {
  supplier_id: string;
  supplier_name: string;
  total_orders: number;
  completed_orders: number;
  fill_rate_percentage: string;
  total_delivered_quantity: string;
  total_accepted_quantity: string;
  total_rejected_quantity: string;
  returns_count: number;
  standard_lead_time_days: number;
  payment_terms: string;
}

export interface ProcurementReports {
  supplier_spend: Array<{
    supplier__name: string;
    supplier__supplier_code: string;
    total_spend: string;
    po_count: number;
  }>;
  po_status_distribution: Array<{
    status: POStatus;
    count: number;
    total_value: string;
  }>;
  overdue_pos_count: number;
}
