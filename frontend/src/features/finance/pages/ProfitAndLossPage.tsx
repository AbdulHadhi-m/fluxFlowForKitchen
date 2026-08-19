import React, { useState } from "react";
import { useProfitAndLoss } from "../hooks/useFinance";
import { TrendingUp, Calendar } from "lucide-react";

export const ProfitAndLossPage: React.FC = () => {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: pnl, isLoading } = useProfitAndLoss({
    start_date: startDate,
    end_date: endDate,
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Computing authoritative Income Statement (P&L)...
      </div>
    );
  }

  const netRevenue = parseFloat(pnl?.revenue?.net_revenue || "0.00");
  const totalCogs = parseFloat(pnl?.cogs?.total_cogs || "0.00");
  const grossProfit = parseFloat(pnl?.gross_profit || "0.00");
  const opExpenses = parseFloat(pnl?.operating_expenses?.total_operating_expenses || "0.00");
  const netProfit = parseFloat(pnl?.net_profit || "0.00");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Profit & Loss (Income Statement)</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative revenue, cost of goods sold, operating expenses, and net profit margins
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-slate-500 ml-1.5" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-slate-900 dark:text-white focus:outline-none"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Statement Card */}
      <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md overflow-hidden p-8 space-y-6 shadow-2xl">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">Statement of Operations</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Period: {startDate} to {endDate}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Double-Entry Certified
          </span>
        </div>

        {/* 1. REVENUE */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">1. Operating Revenue</h3>
          <div className="space-y-1.5 text-xs pl-4 border-l-2 border-emerald-500/30">
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Gross Food & Beverage Sales</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.revenue?.gross_sales || "0.00").toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Delivery & Service Fee Revenue</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.revenue?.delivery_fees || "0.00").toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500 dark:text-slate-400">
              <span>Less: Promotional Discounts & Coupons</span>
              <span className="font-mono text-rose-400">-₹{parseFloat(pnl?.revenue?.discounts || "0.00").toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-sm font-bold">
            <span className="text-slate-900 dark:text-white">Net Operating Revenue</span>
            <span className="font-mono text-emerald-400">₹{netRevenue.toFixed(2)}</span>
          </div>
        </div>

        {/* 2. COST OF GOODS SOLD */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">2. Cost of Goods Sold (COGS)</h3>
          <div className="space-y-1.5 text-xs pl-4 border-l-2 border-amber-500/30">
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Kitchen Food Ingredients Cost</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.cogs?.food || "0.00").toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Beverage & Bar Consumption</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.cogs?.beverage || "0.00").toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Food Wastage & Spoilage Cost</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.cogs?.wastage || "0.00").toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-sm font-bold">
            <span className="text-slate-900 dark:text-white">Total Cost of Goods Sold</span>
            <span className="font-mono text-rose-400">₹{totalCogs.toFixed(2)}</span>
          </div>
        </div>

        {/* GROSS PROFIT */}
        <div className="flex justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-base font-black">
          <div className="text-slate-900 dark:text-white">
            Gross Profit Margin
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-2">({pnl?.gross_margin_pct || "0.00%"})</span>
          </div>
          <span className="font-mono text-emerald-400">₹{grossProfit.toFixed(2)}</span>
        </div>

        {/* 3. OPERATING EXPENSES */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">3. Operating Expenses</h3>
          <div className="space-y-1.5 text-xs pl-4 border-l-2 border-rose-500/30">
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Staff Wages & Kitchen Payroll</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.operating_expenses?.payroll || "0.00").toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Restaurant Rent & Occupancy</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.operating_expenses?.rent || "0.00").toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Utilities (Electricity, Gas, Water)</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.operating_expenses?.utilities || "0.00").toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Equipment Maintenance & Repairs</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.operating_expenses?.maintenance || "0.00").toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Marketing, Advertising & Campaigns</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.operating_expenses?.marketing || "0.00").toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Packaging, Disposables & Supplies</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.operating_expenses?.supplies || "0.00").toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
              <span>Payment Processing & Merchant Fees</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">₹{parseFloat(pnl?.operating_expenses?.merchant_fees || "0.00").toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-sm font-bold">
            <span className="text-slate-900 dark:text-white">Total Operating Expenses</span>
            <span className="font-mono text-rose-400">₹{opExpenses.toFixed(2)}</span>
          </div>
        </div>

        {/* NET PROFIT */}
        <div className={`flex justify-between p-5 rounded-2xl border text-lg font-black ${
          netProfit >= 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"
        }`}>
          <div className="flex items-center gap-2">
            <span>Net Operating Income (EBIT)</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">({pnl?.net_margin_pct || "0.00%"})</span>
          </div>
          <span className="font-mono text-2xl">₹{netProfit.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
