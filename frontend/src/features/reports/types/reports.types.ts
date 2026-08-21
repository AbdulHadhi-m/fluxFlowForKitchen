export type DatePreset =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "CUSTOM";

export interface SalesSummary {
  gross_sales: string;
  discount_amount?: string;
  discounts?: string;
  service_charge?: string;
  tax_amount?: string;
  tax?: string;
  net_sales: string;
  total_paid: string;
  balance_due: string;
  total_bills?: number;
  bill_count?: number;
  average_order_value: string;
}

export interface OrdersSummary {
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  active_orders: number;
  completion_rate?: number;
}

export interface PaymentBreakdownItem {
  payment_method: string;
  total_amount: string;
  count: number;
  percentage?: string;
}

export interface InventorySummary {
  total_items: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
}

export interface ProcurementSummary {
  open_purchase_orders: number;
  pending_approval: number;
}

export interface CategorySalesItem {
  category_name: string;
  total_revenue: string;
  quantity_sold: number;
  percentage: string;
}

export interface HourlySalesTrend {
  hour: number;
  net_sales: string;
  order_count: number;
}

export interface DashboardSummaryData {
  sales: SalesSummary;
  orders: OrdersSummary;
  payments: PaymentBreakdownItem[];
  inventory: InventorySummary;
  procurement: ProcurementSummary;
  categories?: CategorySalesItem[];
  hourly_trends?: HourlySalesTrend[];
}

export interface DailySalesTrend {
  date: string;
  gross_sales: string;
  net_sales: string;
  total_paid: string;
  order_count: number;
}

export interface SalesReportData {
  summary: SalesSummary;
  daily_trends: DailySalesTrend[];
  hourly_trends?: HourlySalesTrend[];
  categories?: CategorySalesItem[];
}

export interface PopularMenuItem {
  item_name: string;
  quantity_sold: number;
  revenue: string;
  order_count: number;
}
