import React from "react";
import { useBankAccounts, useBankTransactions, useReconcileBankTransaction } from "../hooks/useFinance";
import { Landmark } from "lucide-react";

export const BankReconciliationPage: React.FC = () => {
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: transactions = [], isLoading } = useBankTransactions();
  const reconcileMutation = useReconcileBankTransaction();

  const handleReconcile = async (id: string) => {
    try {
      await reconcileMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to reconcile bank transaction.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Landmark className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Bank Accounts & Statement Reconciliation</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Reconcile statement settlements against POS payments, card clearing, and supplier bank wires
          </p>
        </div>
      </div>

      {/* Bank Accounts Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map((ba) => (
          <div key={ba.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 backdrop-blur-md space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{ba.account_name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ba.bank_name}</p>
              </div>
              <span className="font-mono text-xs text-emerald-400 font-bold">{ba.masked_account_number}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Linked GL Account:</span>
              <strong className="text-slate-900 dark:text-white font-mono">{ba.gl_account_code || "1010"}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Bank Transactions Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 w-28">Date</th>
              <th className="p-4">Bank Account</th>
              <th className="p-4">Description</th>
              <th className="p-4 w-28">Type</th>
              <th className="p-4 w-32 font-mono text-right">Amount (₹)</th>
              <th className="p-4 w-28 text-center">Status</th>
              <th className="p-4 w-28 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500">
                  Loading bank transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500">
                  No bank transactions imported.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{tx.transaction_date}</td>
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-200">{tx.bank_account_name}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{tx.description}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className={`p-4 font-mono text-right font-bold ${
                    parseFloat(tx.amount) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    ${parseFloat(tx.amount).toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      tx.reconciliation_status === "RECONCILED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : tx.reconciliation_status === "MATCHED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                    }`}>
                      {tx.reconciliation_status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {tx.reconciliation_status !== "RECONCILED" && (
                      <button
                        onClick={() => handleReconcile(tx.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      >
                        Reconcile
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
