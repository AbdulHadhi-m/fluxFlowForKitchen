import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "../api/finance.api";
import { Account, FinancialPeriod, BankAccount } from "../types/finance.types";

export const FINANCE_KEYS = {
  all: ["finance"] as const,
  accounts: (params?: any) => [...FINANCE_KEYS.all, "accounts", params] as const,
  journals: (params?: any) => [...FINANCE_KEYS.all, "journals", params] as const,
  cashSessions: () => [...FINANCE_KEYS.all, "cash-sessions"] as const,
  bankAccounts: () => [...FINANCE_KEYS.all, "bank-accounts"] as const,
  bankTransactions: () => [...FINANCE_KEYS.all, "bank-transactions"] as const,
  receivables: () => [...FINANCE_KEYS.all, "receivables"] as const,
  payables: () => [...FINANCE_KEYS.all, "payables"] as const,
  expenses: () => [...FINANCE_KEYS.all, "expenses"] as const,
  periods: () => [...FINANCE_KEYS.all, "periods"] as const,
  trialBalance: (date?: string) => [...FINANCE_KEYS.all, "trial-balance", date] as const,
  profitAndLoss: (params?: any) => [...FINANCE_KEYS.all, "profit-loss", params] as const,
  balanceSheet: (date?: string) => [...FINANCE_KEYS.all, "balance-sheet", date] as const,
  cashFlow: (params?: any) => [...FINANCE_KEYS.all, "cash-flow", params] as const,
  generalLedger: (params?: any) => [...FINANCE_KEYS.all, "ledger", params] as const,
  dashboard: () => [...FINANCE_KEYS.all, "dashboard"] as const,
};

// Queries
export const useAccounts = (params?: { category?: string }) =>
  useQuery({
    queryKey: FINANCE_KEYS.accounts(params),
    queryFn: () => financeApi.getAccounts(params),
  });

export const useJournals = (params?: { status?: string }) =>
  useQuery({
    queryKey: FINANCE_KEYS.journals(params),
    queryFn: () => financeApi.getJournals(params),
  });

export const useCashSessions = () =>
  useQuery({
    queryKey: FINANCE_KEYS.cashSessions(),
    queryFn: financeApi.getCashSessions,
  });

export const useBankAccounts = () =>
  useQuery({
    queryKey: FINANCE_KEYS.bankAccounts(),
    queryFn: financeApi.getBankAccounts,
  });

export const useBankTransactions = () =>
  useQuery({
    queryKey: FINANCE_KEYS.bankTransactions(),
    queryFn: financeApi.getBankTransactions,
  });

export const useReceivables = () =>
  useQuery({
    queryKey: FINANCE_KEYS.receivables(),
    queryFn: financeApi.getReceivables,
  });

export const usePayables = () =>
  useQuery({
    queryKey: FINANCE_KEYS.payables(),
    queryFn: financeApi.getPayables,
  });

export const useExpenses = () =>
  useQuery({
    queryKey: FINANCE_KEYS.expenses(),
    queryFn: financeApi.getExpenses,
  });

export const usePeriods = () =>
  useQuery({
    queryKey: FINANCE_KEYS.periods(),
    queryFn: financeApi.getPeriods,
  });

export const useTrialBalance = (asOfDate?: string) =>
  useQuery({
    queryKey: FINANCE_KEYS.trialBalance(asOfDate),
    queryFn: () => financeApi.getTrialBalance(asOfDate),
  });

export const useProfitAndLoss = (params?: { start_date?: string; end_date?: string }) =>
  useQuery({
    queryKey: FINANCE_KEYS.profitAndLoss(params),
    queryFn: () => financeApi.getProfitAndLoss(params),
  });

export const useBalanceSheet = (asOfDate?: string) =>
  useQuery({
    queryKey: FINANCE_KEYS.balanceSheet(asOfDate),
    queryFn: () => financeApi.getBalanceSheet(asOfDate),
  });

export const useCashFlow = (params?: { start_date?: string; end_date?: string }) =>
  useQuery({
    queryKey: FINANCE_KEYS.cashFlow(params),
    queryFn: () => financeApi.getCashFlow(params),
  });

export const useGeneralLedger = (params?: { account_id?: string; start_date?: string; end_date?: string }) =>
  useQuery({
    queryKey: FINANCE_KEYS.generalLedger(params),
    queryFn: () => financeApi.getGeneralLedger(params),
  });

export const useFinanceDashboard = () =>
  useQuery({
    queryKey: FINANCE_KEYS.dashboard(),
    queryFn: financeApi.getFinanceDashboard,
  });

// Mutations
export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Account>) => financeApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
    },
  });
};

export const useSeedDefaultAccounts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.seedDefaultAccounts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
    },
  });
};

export const useCreateJournal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => financeApi.createJournal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
    },
  });
};

export const usePostJournal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.postJournal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
    },
  });
};

export const useVoidJournal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => financeApi.voidJournal(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
    },
  });
};

export const useOpenCashSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.openCashSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.cashSessions() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.dashboard() });
    },
  });
};

export const usePayoutCashSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount: string; reason: string; category?: string } }) =>
      financeApi.payoutCashSession(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.cashSessions() });
    },
  });
};

export const useCloseCashSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { counted_cash: string; notes?: string } }) =>
      financeApi.closeCashSession(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
    },
  });
};

export const useApproveCashVariance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approval_notes }: { id: string; approval_notes?: string }) =>
      financeApi.approveCashVariance(id, { approval_notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.cashSessions() });
    },
  });
};

export const useCreateBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BankAccount>) => financeApi.createBankAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.bankAccounts() });
    },
  });
};

export const useMatchBankTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payment_id }: { id: string; payment_id: string }) =>
      financeApi.matchBankTransaction(id, payment_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.bankTransactions() });
    },
  });
};

export const useReconcileBankTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.reconcileBankTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.bankTransactions() });
    },
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => financeApi.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.expenses() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.dashboard() });
    },
  });
};

export const useSubmitExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.submitExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.expenses() });
    },
  });
};

export const useApproveExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.approveExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.all });
    },
  });
};

export const useCreatePeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FinancialPeriod>) => financeApi.createPeriod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.periods() });
    },
  });
};

export const useClosePeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => financeApi.closePeriod(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.periods() });
    },
  });
};

export const useReopenPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeApi.reopenPeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.periods() });
    },
  });
};
