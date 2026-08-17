import React from "react";
import { useFinanceDashboard } from "../hooks/useFinance";
import { Link } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  Scale,
  Landmark,
  BookOpen,
  Receipt,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Calendar,
} from "lucide-react";

export const FinanceDashboardPage: React.FC = () => {
  const { data: dashboard, isLoading } = useFinanceDashboard();

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Loading financial overview & double-entry ledger...
      </div>
    );
  }

  const netRevenue = parseFloat(dashboard?.net_revenue || "0.00");
  const grossProfit = parseFloat(dashboard?.gross_profit || "0.00");
  const netProfit = parseFloat(dashboard?.net_profit || "0.00");
  const opExpenses = parseFloat(dashboard?.operating_expenses || "0.00");
  const cashOnHand = parseFloat(dashboard?.cash_on_hand || "0.00");
  const bankBalance = parseFloat(dashboard?.bank_balance || "0.00");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Finance & Accounting Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Double-entry General Ledger, P&L, Balance Sheet, Cash Sessions, and Reconciliation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/finance/profit-loss"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-slate-700/60 transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            P&L Statement
          </Link>
          <Link
            to="/finance/journal"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Scale className="w-4 h-4" />
            General Journal
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
            <span>Net Sales Revenue (MTD)</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-white">${netRevenue.toFixed(2)}</p>
          <div className="text-[11px] text-slate-400">Gross Sales minus discounts</div>
        </div>

        {/* Gross Profit */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
            <span>Gross Profit (Margin)</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-indigo-400">${grossProfit.toFixed(2)}</p>
          <div className="text-[11px] text-slate-400">Margin: <strong className="text-white">{dashboard?.gross_margin_pct || "0.00%"}</strong></div>
        </div>

        {/* Operating Expenses */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
            <span>Operating Expenses</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black font-mono text-rose-400">${opExpenses.toFixed(2)}</p>
          <div className="text-[11px] text-slate-400">Rent, payroll, utilities & marketing</div>
        </div>

        {/* Net Profit */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
            <span>Net Operating Margin</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className={`text-2xl font-black font-mono ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ${netProfit.toFixed(2)}
          </p>
          <div className="text-[11px] text-slate-400">Net: <strong className="text-white">{dashboard?.net_margin_pct || "0.00%"}</strong></div>
        </div>
      </div>

      {/* Cash & Bank Liquidity + Ledger Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cash & Bank Balances */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-400" /> Liquid Cash & Banking
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <p className="text-xs font-semibold text-white">Physical Drawer Cash</p>
                <p className="text-[10px] text-slate-400">{dashboard?.open_cash_sessions || 0} active drawer sessions</p>
              </div>
              <span className="font-mono text-base font-bold text-emerald-400">${cashOnHand.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <p className="text-xs font-semibold text-white">Main Operating Checking</p>
                <p className="text-[10px] text-slate-400">General Ledger Account #1010</p>
              </div>
              <span className="font-mono text-base font-bold text-indigo-400">${bankBalance.toFixed(2)}</span>
            </div>
          </div>

          <Link
            to="/finance/cash"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
          >
            Manage Cash Drawers & Payouts <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Double-Entry Integrity Status */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> Ledger Health & Integrity
          </h2>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${dashboard?.is_trial_balance_healthy ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {dashboard?.is_trial_balance_healthy ? "Trial Balance 100% Balanced" : "Trial Balance Discrepancy"}
                </p>
                <p className="text-[10px] text-slate-400">Total Debits == Total Credits verified</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-3">
              <div>
                <span className="text-slate-400">COGS (Food & Bar):</span>
                <p className="font-mono text-slate-200 font-bold">${parseFloat(dashboard?.total_cogs || "0.00").toFixed(2)}</p>
              </div>
              <div>
                <span className="text-slate-400">Pending Expenses:</span>
                <p className="font-mono text-slate-200 font-bold">{dashboard?.pending_expenses || 0} claims</p>
              </div>
            </div>
          </div>

          <Link
            to="/finance/trial-balance"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
          >
            Inspect Trial Balance <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Quick Module Navigation */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Financial Workspaces</h2>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <Link
              to="/finance/accounts"
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex flex-col gap-1"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Chart of Accounts</span>
            </Link>

            <Link
              to="/finance/balance-sheet"
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex flex-col gap-1"
            >
              <Scale className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold">Balance Sheet</span>
            </Link>

            <Link
              to="/finance/receivables"
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex flex-col gap-1"
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Receivables (AR)</span>
            </Link>

            <Link
              to="/finance/payables"
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all flex flex-col gap-1"
            >
              <Building2 className="w-4 h-4 text-rose-400" />
              <span className="font-semibold">Payables (AP)</span>
            </Link>
          </div>

          <Link
            to="/finance/periods"
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-all"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>Accounting Period Closing</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>
      </div>
    </div>
  );
};
