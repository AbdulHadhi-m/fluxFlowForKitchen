import React, { useState } from "react";
import { useGeneralLedger, useAccounts } from "../hooks/useFinance";
import { BookOpen } from "lucide-react";

export const GeneralLedgerPage: React.FC = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: accounts = [] } = useAccounts();
  const { data: ledger, isLoading } = useGeneralLedger({
    account_id: selectedAccountId || undefined,
    start_date: startDate,
    end_date: endDate,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">General Ledger Running Balances</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Detailed chronological transaction entries with running balances per account
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="w-64">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- All General Ledger Accounts --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name} ({a.category})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <strong className="text-slate-900 dark:text-white">{ledger?.total_records || 0}</strong> posted entries
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 w-28">Date</th>
              <th className="p-4 w-32">JE #</th>
              <th className="p-4">Account</th>
              <th className="p-4">Narration</th>
              <th className="p-4 w-28 font-mono text-right">Debit ($)</th>
              <th className="p-4 w-28 font-mono text-right">Credit ($)</th>
              <th className="p-4 w-24">Cost Center</th>
              <th className="p-4 w-32 font-mono text-right">Running Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  Loading General Ledger...
                </td>
              </tr>
            ) : !ledger || ledger.lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  No posted ledger entries found for selected account and date range.
                </td>
              </tr>
            ) : (
              ledger.lines.map((l) => (
                <tr key={l.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{l.date}</td>
                  <td className="p-4 font-mono font-bold text-indigo-400">{l.entry_number}</td>
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-200">
                    <span className="font-mono text-slate-500 dark:text-slate-400 mr-2">{l.account_code}</span>
                    {l.account_name}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 truncate max-w-xs">{l.description || "—"}</td>
                  <td className="p-4 font-mono text-right text-emerald-400">
                    {parseFloat(l.debit) > 0 ? `$${parseFloat(l.debit).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-4 font-mono text-right text-indigo-400">
                    {parseFloat(l.credit) > 0 ? `$${parseFloat(l.credit).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{l.cost_center}</td>
                  <td className="p-4 font-mono text-right font-bold text-slate-900 dark:text-white">
                    ${parseFloat(l.running_balance).toFixed(2)}
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
