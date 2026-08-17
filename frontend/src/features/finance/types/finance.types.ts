export type AccountCategory = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";
export type CostCenter = "KITCHEN" | "FOH" | "BAR" | "DELIVERY" | "ADMIN" | "MARKETING";

export interface Account {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  category_display: string;
  normal_balance: NormalBalance;
  normal_balance_display: string;
  parent: string | null;
  description: string;
  is_system_account: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type JournalStatus = "DRAFT" | "POSTED" | "VOIDED";
export type SourceDocumentType =
  | "MANUAL"
  | "SALE"
  | "REFUND"
  | "PURCHASE_RECEIPT"
  | "SUPPLIER_INVOICE"
  | "SUPPLIER_PAYMENT"
  | "CASH_PAYOUT"
  | "EXPENSE"
  | "ADJUSTMENT"
  | "PERIOD_CLOSE";

export interface JournalLine {
  id?: string;
  account: string;
  account_code?: string;
  account_name?: string;
  debit: string;
  credit: string;
  description: string;
  reference: string;
  cost_center: CostCenter;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  period: string | null;
  status: JournalStatus;
  source_document_type: SourceDocumentType;
  source_id: string;
  notes: string;
  created_by: string;
  created_by_name: string;
  posted_by: string | null;
  posted_by_name: string | null;
  posted_at: string | null;
  total_debit: string;
  total_credit: string;
  is_balanced: boolean;
  lines: JournalLine[];
  created_at: string;
  updated_at: string;
}

export type CashSessionStatus = "OPEN" | "CLOSED" | "RECONCILIATION_REQUIRED";

export interface CashTransaction {
  id: string;
  session: string;
  transaction_type: "SALE" | "PAYOUT" | "REFUND" | "DROP" | "ADD";
  amount: string;
  reason: string;
  category: string;
  reference: string;
  performed_by: string;
  performed_by_name: string;
  created_at: string;
}

export interface CashSession {
  id: string;
  register_name: string;
  opened_by: string;
  opened_by_name: string;
  closed_by: string | null;
  closed_by_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_balance: string;
  cash_sales: string;
  cash_payouts: string;
  cash_refunds: string;
  expected_cash: string;
  counted_cash: string | null;
  variance: string;
  status: CashSessionStatus;
  notes: string;
  approval_notes: string;
  transactions: CashTransaction[];
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  masked_account_number: string;
  currency: string;
  account_type: "CHECKING" | "SAVINGS" | "MERCHANT_CLEARING";
  gl_account: string;
  gl_account_code: string;
  is_active: boolean;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  bank_account: string;
  bank_account_name: string;
  transaction_date: string;
  amount: string;
  transaction_type: "DEPOSIT" | "WITHDRAWAL" | "FEE" | "TRANSFER" | "SETTLEMENT";
  reference: string;
  description: string;
  reconciliation_status: "UNMATCHED" | "MATCHED" | "RECONCILED" | "EXCLUDED";
  matched_payment_id: string;
  reconciled_at: string | null;
  created_at: string;
}

export interface AccountsReceivable {
  id: string;
  customer: string;
  customer_name: string;
  bill: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: string;
  paid_amount: string;
  balance_due: string;
  status: "OPEN" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "VOID";
  notes: string;
  created_at: string;
}

export interface AccountsPayable {
  id: string;
  supplier: string;
  supplier_name: string;
  supplier_invoice: string | null;
  po_number: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: string;
  paid_amount: string;
  balance_due: string;
  status: "OPEN" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "DISPUTED" | "VOID";
  notes: string;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  category: string;
  cost_center: CostCenter;
  amount: string;
  tax_amount: string;
  expense_date: string;
  payment_method: string;
  account: string;
  account_name: string;
  payee: string;
  reference: string;
  description: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PAID" | "CANCELLED";
  created_by: string;
  created_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "OPEN" | "CLOSED";
  closed_by: string | null;
  closed_by_name: string | null;
  closed_at: string | null;
  notes: string;
  created_at: string;
}

export interface TrialBalanceReport {
  restaurant_id: string;
  as_of_date: string;
  is_balanced: boolean;
  total_debits: string;
  total_credits: string;
  difference: string;
  accounts: {
    account_id: string;
    code: string;
    name: string;
    category: AccountCategory;
    normal_balance: NormalBalance;
    total_debit: string;
    total_credit: string;
    net_balance: string;
  }[];
}

export interface ProfitAndLossReport {
  period: { start_date: string; end_date: string };
  revenue: {
    gross_sales: string;
    delivery_fees: string;
    discounts: string;
    net_revenue: string;
  };
  cogs: {
    food: string;
    beverage: string;
    wastage: string;
    total_cogs: string;
  };
  gross_profit: string;
  gross_margin_pct: string;
  operating_expenses: {
    payroll: string;
    rent: string;
    utilities: string;
    maintenance: string;
    marketing: string;
    supplies: string;
    merchant_fees: string;
    other: string;
    total_operating_expenses: string;
  };
  net_profit: string;
  net_margin_pct: string;
}

export interface BalanceSheetReport {
  as_of_date: string;
  assets: { total_assets: string };
  liabilities: { total_liabilities: string };
  equity: {
    capital: string;
    retained_period_income: string;
    total_equity: string;
  };
  total_liabilities_and_equity: string;
  is_equation_balanced: boolean;
}

export interface CashFlowReport {
  period: { start_date: string; end_date: string };
  operating_activities: {
    cash_inflows: string;
    cash_outflows: string;
    net_operating_cash_flow: string;
  };
  investing_activities: { net_cash: string };
  financing_activities: { net_cash: string };
  net_cash_movement: string;
}

export interface GeneralLedgerResponse {
  lines: {
    id: string;
    date: string;
    entry_number: string;
    account_code: string;
    account_name: string;
    description: string;
    debit: string;
    credit: string;
    cost_center: CostCenter;
    running_balance: string;
  }[];
  total_records: number;
}

export interface FinanceDashboardSummary {
  net_revenue: string;
  total_cogs: string;
  gross_profit: string;
  gross_margin_pct: string;
  operating_expenses: string;
  net_profit: string;
  net_margin_pct: string;
  cash_on_hand: string;
  bank_balance: string;
  is_trial_balance_healthy: boolean;
  open_cash_sessions: number;
  pending_expenses: number;
}
