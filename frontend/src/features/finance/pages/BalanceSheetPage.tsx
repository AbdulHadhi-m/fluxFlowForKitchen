import React, { useState } from "react";
import { useBalanceSheet } from "../hooks/useFinance";
import { Scale, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";

export const BalanceSheetPage: React.FC = () => {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: sheet, isLoading } = useBalanceSheet(asOfDate);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Computing Statement of Financial Position (Balance Sheet)...
      </div>
    );
  }

  const assets = parseFloat(sheet?.assets?.total_assets || "0.00");
  const liabilities = parseFloat(sheet?.liabilities?.total_liabilities || "0.00");
  const equity = parseFloat(sheet?.equity?.total_equity || "0.00");
  const capital = parseFloat(sheet?.equity?.capital || "0.00");
  const retainedIncome = parseFloat(sheet?.equity?.retained_period_income || "0.00");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Scale className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Balance Sheet (Financial Position)</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative snapshot of Assets, Liabilities, and Owner's Equity
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-1.5 rounded-xl text-xs">
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

      {/* Accounting Equation Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
        sheet?.is_equation_balanced
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-300"
          : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-300"
      }`}>
        <div className="flex items-center gap-3">
          {sheet?.is_equation_balanced ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">
              {sheet?.is_equation_balanced ? "Fundamental Accounting Equation Satisfied" : "Discrepancy Detected"}
            </p>
            <p className="text-[11px] opacity-80">
              Assets (${assets.toFixed(2)}) == Liabilities (${liabilities.toFixed(2)}) + Equity (${equity.toFixed(2)})
            </p>
          </div>
        </div>
      </div>

      {/* Balance Sheet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* ASSETS */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Total Assets</h2>
            <span className="font-mono text-emerald-400 font-bold text-base">${assets.toFixed(2)}</span>
          </div>

          <div className="space-y-3 text-xs pl-2">
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Liquid Cash on Hand & Drawers (#1000)</span>
              <span className="font-mono text-slate-900 dark:text-white font-medium">Included</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Operating Bank Accounts (#1010)</span>
              <span className="font-mono text-slate-900 dark:text-white font-medium">Included</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Card & UPI Clearing Accounts (#1020/#1030)</span>
              <span className="font-mono text-slate-900 dark:text-white font-medium">Included</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Customer Receivables (#1100)</span>
              <span className="font-mono text-slate-900 dark:text-white font-medium">Included</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Inventory Asset (#1200)</span>
              <span className="font-mono text-slate-900 dark:text-white font-medium">Included</span>
            </div>
          </div>
        </div>

        {/* LIABILITIES & EQUITY */}
        <div className="space-y-6">
          {/* Liabilities */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Total Liabilities</h2>
              <span className="font-mono text-rose-400 font-bold text-base">${liabilities.toFixed(2)}</span>
            </div>

            <div className="space-y-2 text-xs pl-2">
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                <span>Supplier Accounts Payable (#2000)</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">Included</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                <span>Sales Tax & VAT Payable (#2100)</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">Included</span>
              </div>
            </div>
          </div>

          {/* Equity */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md p-6 space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Owner's Equity</h2>
              <span className="font-mono text-purple-400 font-bold text-base">${equity.toFixed(2)}</span>
            </div>

            <div className="space-y-2 text-xs pl-2">
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                <span>Capital & Initial Equity (#3000)</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">${capital.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                <span>Current Retained Net Income (P&L Roll-up)</span>
                <span className="font-mono text-emerald-400 font-medium">${retainedIncome.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
