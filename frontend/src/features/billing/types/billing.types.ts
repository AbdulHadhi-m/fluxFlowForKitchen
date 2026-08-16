export type BillStatus = "DRAFT" | "FINALIZED" | "PARTIALLY_PAID" | "PAID" | "VOID";
export type DiscountType = "NONE" | "PERCENTAGE" | "FIXED";
export type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "OTHER";
export type PaymentStatus = "SUCCESS" | "FAILED" | "REFUNDED";

export interface BillItem {
  id: string;
  name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

export interface Payment {
  id: string;
  payment_method: PaymentMethod;
  amount: string;
  amount_tendered: string | null;
  change_returned: string;
  reference: string;
  status: PaymentStatus;
  received_by_name: string;
  created_at: string;
}

export interface Bill {
  id: string;
  bill_number: string;
  order_id: string;
  order_number: string;
  table_name: string | null;
  cashier_name: string;
  status: BillStatus;
  status_display: string;
  subtotal: string;
  discount_type: DiscountType;
  discount_value: string;
  discount_amount: string;
  service_charge_rate: string;
  service_charge_amount: string;
  tax_rate_snapshot: string;
  tax_amount: string;
  rounding_adjustment: string;
  grand_total: string;
  total_paid: string;
  balance_due: string;
  notes: string;
  items: BillItem[];
  payments: Payment[];
  created_at: string;
  updated_at: string;
}

export interface CreateBillPayload {
  order_id: string;
  discount_type?: DiscountType;
  discount_value?: number;
  service_charge_rate?: number;
  notes?: string;
}

export interface ProcessPaymentPayload {
  amount: number;
  payment_method: PaymentMethod;
  amount_tendered?: number | null;
  reference?: string;
  idempotency_key?: string;
}
