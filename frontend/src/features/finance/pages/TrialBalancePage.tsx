import React, { useState } from "react";
import { useTrialBalance } from "../hooks/useFinance";
import { Scale, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";

export const TrialBalancePage: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: tb, isLoading } = useTrialBalance(asOfDate);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Computing General Ledger Trial Balance...
      </div>
    );
  }

  const totalDebits = parseFloat(tb?.total_debits || "0.00");
  const totalCredits = parseFloat(tb?.total_credits || "0.00");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Scale className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">General Ledger Trial Balance</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Verification of arithmetic equality across all active debit and credit accounts
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-slate-500 ml-1.5" />
          <span className="text-slate-500 dark:text-slate-400">As of Date:</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="bg-transparent text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Trial Balance Health Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
        tb?.is_balanced
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-300"
          : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-300"
      }`}>
        <div className="flex items-center gap-3">
          {tb?.is_balanced ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">
              {tb?.is_balanced ? "Trial Balance Perfectly In Equilibrium" : "Trial Balance Out of Balance!"}
            </p>
            <p className="text-[11px] opacity-80">
              Total Debits (${totalDebits.toFixed(2)}) == Total Credits (${totalCredits.toFixed(2)})
            </p>
          </div>
        </div>
      </div>

      {/* Trial Balance Grid */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 w-28">Code</th>
              <th className="p-4">Account Title</th>
              <th className="p-4 w-28">Category</th>
              <th className="p-4 w-32 font-mono text-right">Debit Balance ($)</th>
              <th className="p-4 w-32 font-mono text-right">Credit Balance ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {!tb || tb.accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-500">
                  No account movements posted as of {asOfDate}.
                </td>
              </tr>
            ) : (
              tb.accounts.map((acc) => (
                <tr key={acc.account_id} className="hover:bg-slate-100/70 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{acc.code}</td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">{acc.name}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{acc.category}</td>
                  <td className="p-4 font-mono text-right text-emerald-400 font-medium">
                    {parseFloat(acc.total_debit) > 0 ? `$${parseFloat(acc.total_debit).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-4 font-mono text-right text-indigo-400 font-medium">
                    {parseFloat(acc.total_credit) > 0 ? `$${parseFloat(acc.total_credit).toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
            <tr>
              <td colSpan={3} className="p-4 uppercase tracking-wider">Total Equilibrium Verification</td>
              <td className="p-4 font-mono text-right text-emerald-400 text-sm">${totalDebits.toFixed(2)}</td>
              <td className="p-4 font-mono text-right text-indigo-400 text-sm">${totalCredits.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
