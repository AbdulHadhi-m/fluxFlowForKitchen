import { apiClient } from "@/lib/api-client";
import {
  Account,
  JournalEntry,
  CashSession,
  CashTransaction,
  BankAccount,
  BankTransaction,
  AccountsReceivable,
  AccountsPayable,
  Expense,
  FinancialPeriod,
  TrialBalanceReport,
  ProfitAndLossReport,
  BalanceSheetReport,
  CashFlowReport,
  GeneralLedgerResponse,
  FinanceDashboardSummary,
} from "../types/finance.types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, any>;
}

export const financeApi = {
  // Chart of Accounts
  getAccounts: async (params?: { category?: string }): Promise<Account[]> => {
    const res = await apiClient.get<ApiResponse<Account[]>>("/finance/accounts/", { params });
    return res.data.data;
  },
  createAccount: async (data: Partial<Account>): Promise<Account> => {
    const res = await apiClient.post<Account>("/finance/accounts/", data);
    return res.data;
  },
  seedDefaultAccounts: async (): Promise<Account[]> => {
    const res = await apiClient.post<Account[]>("/finance/accounts/seed-defaults/");
    return res.data;
  },

  // Journal Entries
  getJournals: async (params?: { status?: string }): Promise<JournalEntry[]> => {
    const res = await apiClient.get<ApiResponse<JournalEntry[]>>("/finance/journals/", { params });
    return res.data.data;
  },
  createJournal: async (data: any): Promise<JournalEntry> => {
    const res = await apiClient.post<JournalEntry>("/finance/journals/", data);
    return res.data;
  },
  postJournal: async (id: string): Promise<JournalEntry> => {
    const res = await apiClient.post<JournalEntry>(`/finance/journals/${id}/post/`);
    return res.data;
  },
  voidJournal: async (id: string, reason: string): Promise<any> => {
    const res = await apiClient.post(`/finance/journals/${id}/void/`, { reason });
    return res.data;
  },

  // Cash Sessions & Register Management
  getCashSessions: async (): Promise<CashSession[]> => {
    const res = await apiClient.get<ApiResponse<CashSession[]>>("/finance/cash-sessions/");
    return res.data.data;
  },
  openCashSession: async (data: { register_name: string; opening_balance: string }): Promise<CashSession> => {
    const res = await apiClient.post<CashSession>("/finance/cash-sessions/", data);
    return res.data;
  },
  payoutCashSession: async (id: string, data: { amount: string; reason: string; category?: string }): Promise<CashTransaction> => {
    const res = await apiClient.post<CashTransaction>(`/finance/cash-sessions/${id}/payout/`, data);
    return res.data;
  },
  closeCashSession: async (id: string, data: { counted_cash: string; notes?: string }): Promise<CashSession> => {
    const res = await apiClient.post<CashSession>(`/finance/cash-sessions/${id}/close/`, data);
    return res.data;
  },
  approveCashVariance: async (id: string, data: { approval_notes?: string }): Promise<CashSession> => {
    const res = await apiClient.post<CashSession>(`/finance/cash-sessions/${id}/approve-variance/`, data);
    return res.data;
  },

  // Bank Accounts & Transactions
  getBankAccounts: async (): Promise<BankAccount[]> => {
    const res = await apiClient.get<ApiResponse<BankAccount[]>>("/finance/bank-accounts/");
    return res.data.data;
  },
  createBankAccount: async (data: Partial<BankAccount>): Promise<BankAccount> => {
    const res = await apiClient.post<BankAccount>("/finance/bank-accounts/", data);
    return res.data;
  },
  getBankTransactions: async (): Promise<BankTransaction[]> => {
    const res = await apiClient.get<ApiResponse<BankTransaction[]>>("/finance/bank-transactions/");
    return res.data.data;
  },
  matchBankTransaction: async (id: string, payment_id: string): Promise<BankTransaction> => {
    const res = await apiClient.post<BankTransaction>(`/finance/bank-transactions/${id}/match/`, { payment_id });
    return res.data;
  },
  reconcileBankTransaction: async (id: string): Promise<BankTransaction> => {
    const res = await apiClient.post<BankTransaction>(`/finance/bank-transactions/${id}/reconcile/`);
    return res.data;
  },

  // Accounts Receivable & Accounts Payable
  getReceivables: async (): Promise<AccountsReceivable[]> => {
    const res = await apiClient.get<ApiResponse<AccountsReceivable[]>>("/finance/receivables/");
    return res.data.data;
  },
  getPayables: async (): Promise<AccountsPayable[]> => {
    const res = await apiClient.get<ApiResponse<AccountsPayable[]>>("/finance/payables/");
    return res.data.data;
  },

  // Operational Expenses
  getExpenses: async (): Promise<Expense[]> => {
    const res = await apiClient.get<ApiResponse<Expense[]>>("/finance/expenses/");
    return res.data.data;
  },
  createExpense: async (data: any): Promise<Expense> => {
    const res = await apiClient.post<Expense>("/finance/expenses/", data);
    return res.data;
  },
  submitExpense: async (id: string): Promise<Expense> => {
    const res = await apiClient.post<Expense>(`/finance/expenses/${id}/submit/`);
    return res.data;
  },
  approveExpense: async (id: string): Promise<Expense> => {
    const res = await apiClient.post<Expense>(`/finance/expenses/${id}/approve/`);
    return res.data;
  },

  // Financial Periods
  getPeriods: async (): Promise<FinancialPeriod[]> => {
    const res = await apiClient.get<ApiResponse<FinancialPeriod[]>>("/finance/periods/");
    return res.data.data;
  },
  createPeriod: async (data: Partial<FinancialPeriod>): Promise<FinancialPeriod> => {
    const res = await apiClient.post<FinancialPeriod>("/finance/periods/", data);
    return res.data;
  },
  closePeriod: async (id: string, data: { notes?: string }): Promise<FinancialPeriod> => {
    const res = await apiClient.post<FinancialPeriod>(`/finance/periods/${id}/close/`, data);
    return res.data;
  },
  reopenPeriod: async (id: string): Promise<FinancialPeriod> => {
    const res = await apiClient.post<FinancialPeriod>(`/finance/periods/${id}/reopen/`);
    return res.data;
  },

  // Financial Statements & Reports
  getTrialBalance: async (as_of_date?: string): Promise<TrialBalanceReport> => {
    const res = await apiClient.get<TrialBalanceReport>("/finance/trial-balance/", { params: { as_of_date } });
    return res.data;
  },
  getProfitAndLoss: async (params?: { start_date?: string; end_date?: string }): Promise<ProfitAndLossReport> => {
    const res = await apiClient.get<ProfitAndLossReport>("/finance/profit-loss/", { params });
    return res.data;
  },
  getBalanceSheet: async (as_of_date?: string): Promise<BalanceSheetReport> => {
    const res = await apiClient.get<BalanceSheetReport>("/finance/balance-sheet/", { params: { as_of_date } });
    return res.data;
  },
  getCashFlow: async (params?: { start_date?: string; end_date?: string }): Promise<CashFlowReport> => {
    const res = await apiClient.get<CashFlowReport>("/finance/cash-flow/", { params });
    return res.data;
  },
  getGeneralLedger: async (params?: { account_id?: string; start_date?: string; end_date?: string }): Promise<GeneralLedgerResponse> => {
    const res = await apiClient.get<GeneralLedgerResponse>("/finance/ledger/", { params });
    return res.data;
  },
  getFinanceDashboard: async (): Promise<FinanceDashboardSummary> => {
    const res = await apiClient.get<FinanceDashboardSummary>("/finance/dashboard/");
    return res.data;
  },
};
