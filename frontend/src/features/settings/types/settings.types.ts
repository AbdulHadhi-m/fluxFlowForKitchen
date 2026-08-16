export interface RestaurantProfile {
  id: string;
  name: string;
  legal_name: string;
  slug: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  timezone: string;
  currency: string;
}

export interface OperationalConfiguration {
  id: string;
  allow_order_cancellation: boolean;
  cancellation_window_minutes: number;
  require_order_confirmation: boolean;
  allow_table_orders: boolean;
  allow_takeaway: boolean;
  default_prep_time_minutes: number;
  kds_warning_threshold_minutes: number;
  kds_critical_threshold_minutes: number;
  auto_refresh_interval_seconds: number;
  tax_enabled: boolean;
  default_tax_rate: string;
  tax_name: string;
  tax_registration_number: string;
  tax_inclusive_pricing: boolean;
  invoice_prefix: string;
  receipt_prefix: string;
  invoice_footer_notes: string;
  allow_negative_stock: boolean;
  require_wastage_reason: boolean;
  low_stock_threshold_default: string;
  po_approval_required: boolean;
  po_approval_threshold: string;
  default_delivery_lead_days: number;
  inventory_alerts_enabled: boolean;
  order_alerts_enabled: boolean;
  procurement_alerts_enabled: boolean;
}

export interface UserPreference {
  id: string;
  theme: "DARK" | "LIGHT" | "SYSTEM";
  time_format: "12H" | "24H";
  date_format: string;
  table_density: "COMPACT" | "COMFORTABLE";
}
