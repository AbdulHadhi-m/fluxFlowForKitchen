import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  ChevronDown,
  TrendingUp,
  Award,
  CreditCard,
  Clock,
} from "lucide-react";
import {
  DashboardSummaryData,
  DailySalesTrend,
  PopularMenuItem,
  DatePreset,
} from "../types/reports.types";
import { exportReportToExcel, exportReportToCsv } from "../utils/exportReport";

interface ExportReportMenuProps {
  preset: DatePreset;
  startDate?: string;
  endDate?: string;
  dashboardData?: DashboardSummaryData | null;
  dailyTrends?: DailySalesTrend[];
  popularItems?: PopularMenuItem[];
}

export const ExportReportMenu: React.FC<ExportReportMenuProps> = ({
  preset,
  startDate,
  endDate,
  dashboardData,
  dailyTrends = [],
  popularItems = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExcelExport = () => {
    setIsExporting(true);
    try {
      exportReportToExcel({
        preset,
        startDate,
        endDate,
        dashboardData,
        dailyTrends,
        popularItems,
      });
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleDailyCsv = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const headers = ["Date", "Net Sales (INR)", "Gross Sales (INR)", "Total Paid (INR)", "Order Count"];
    const rows = dailyTrends.map((t) => [
      t.date,
      t.net_sales,
      t.gross_sales,
      t.total_paid,
      t.order_count,
    ]);
    exportReportToCsv(`Fluxiflow_Daily_Sales_${preset}_${todayStr}`, headers, rows);
    setIsOpen(false);
  };

  const handleDishesCsv = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const headers = ["Rank", "Dish Name", "Quantity Sold", "Order Count", "Total Revenue (INR)"];
    const rows = popularItems.map((item, idx) => [
      idx + 1,
      item.item_name,
      item.quantity_sold,
      item.order_count,
      item.revenue,
    ]);
    exportReportToCsv(`Fluxiflow_Top_Dishes_${preset}_${todayStr}`, headers, rows);
    setIsOpen(false);
  };

  const handlePaymentsCsv = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const payments = dashboardData?.payments || [];
    const headers = ["Payment Method", "Total Amount (INR)", "Transaction Count", "Percentage Share (%)"];
    const rows = payments.map((p) => [
      p.payment_method,
      p.total_amount,
      p.count,
      p.percentage || "0.0",
    ]);
    exportReportToCsv(`Fluxiflow_Payment_Tenders_${preset}_${todayStr}`, headers, rows);
    setIsOpen(false);
  };

  const handleHourlyCsv = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const hourly = dashboardData?.hourly_trends || [];
    const headers = ["Hour (24h)", "Net Sales (INR)", "Order Count"];
    const rows = hourly.map((h) => [h.hour, h.net_sales, h.order_count]);
    exportReportToCsv(`Fluxiflow_Hourly_Operations_${preset}_${todayStr}`, headers, rows);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="h-8 gap-2 px-3 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-xs font-semibold shadow-sm"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
        <span>Export</span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Export Analytics Data
            </span>
          </div>

          {/* Primary Excel Workbook option */}
          <button
            type="button"
            onClick={handleExcelExport}
            className="w-full text-left p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 transition-colors group flex items-start gap-3"
          >
            <div className="p-2 rounded-lg bg-emerald-500 text-white flex-shrink-0 shadow-sm shadow-emerald-500/30">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  Excel Workbook (.xls / .xlsx)
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-[9px]">
                  ALL SHEETS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Full executive report with KPIs, daily trends, menu rankings, tenders &amp; hourly sheets.
              </p>
            </div>
          </button>

          <div className="pt-1 pb-0.5 px-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Individual CSV Tables
            </span>
          </div>

          {/* Daily CSV */}
          <button
            type="button"
            onClick={handleDailyCsv}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
          >
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              <span>Daily Sales Trend</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">.CSV</span>
          </button>

          {/* Top Dishes CSV */}
          <button
            type="button"
            onClick={handleDishesCsv}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
          >
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              <span>Top-Selling Menu Items</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">.CSV</span>
          </button>

          {/* Payments CSV */}
          <button
            type="button"
            onClick={handlePaymentsCsv}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
          >
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <CreditCard className="h-3.5 w-3.5 text-purple-500" />
              <span>Payment Settlements</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">.CSV</span>
          </button>

          {/* Hourly Operations CSV */}
          <button
            type="button"
            onClick={handleHourlyCsv}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
          >
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Clock className="h-3.5 w-3.5 text-emerald-500" />
              <span>Hourly Kitchen Density</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">.CSV</span>
          </button>
        </div>
      )}
    </div>
  );
};
