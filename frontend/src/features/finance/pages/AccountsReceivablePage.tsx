import React from "react";
import { useReceivables } from "../hooks/useFinance";
import { CreditCard } from "lucide-react";

export const AccountsReceivablePage: React.FC = () => {
  const { data: receivables = [], isLoading } = useReceivables();

  const totalOutstanding = receivables.reduce((sum, r) => sum + (parseFloat(r.balance_due) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Accounts Receivable (Customer Credit)</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customer dining credit lines, aging analysis, and settlement tracking
          </p>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total Outstanding AR:</span>
          <strong className="text-base font-mono text-amber-400 font-bold">${totalOutstanding.toFixed(2)}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 w-28">Invoice #</th>
              <th className="p-4">Customer</th>
              <th className="p-4 w-28">Invoice Date</th>
              <th className="p-4 w-28">Due Date</th>
              <th className="p-4 w-28 font-mono text-right">Total ($)</th>
              <th className="p-4 w-28 font-mono text-right">Paid ($)</th>
              <th className="p-4 w-28 font-mono text-right">Balance Due</th>
              <th className="p-4 w-24 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  Loading customer receivables...
                </td>
              </tr>
            ) : receivables.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  No open customer receivables found.
                </td>
              </tr>
            ) : (
              receivables.map((r) => (
                <tr key={r.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{r.invoice_number}</td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">{r.customer_name}</td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{r.invoice_date}</td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{r.due_date}</td>
                  <td className="p-4 font-mono text-right text-slate-900 dark:text-white">${parseFloat(r.total_amount).toFixed(2)}</td>
                  <td className="p-4 font-mono text-right text-emerald-400">${parseFloat(r.paid_amount).toFixed(2)}</td>
                  <td className="p-4 font-mono text-right font-bold text-amber-400">${parseFloat(r.balance_due).toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-400 border-amber-500/20">
                      {r.status}
                    </span>
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
