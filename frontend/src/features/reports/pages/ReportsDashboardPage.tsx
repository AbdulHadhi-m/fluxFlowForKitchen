import React, { useState } from "react";
import { useReports } from "../hooks/useReports";
import { DatePreset } from "../types/reports.types";
import { DateRangePicker } from "../components/DateRangePicker";
import { SalesKPICard } from "../components/SalesKPICard";
import { SalesTrendChart } from "../components/SalesTrendChart";
import { PaymentBreakdownCard } from "../components/PaymentBreakdownCard";
import { PopularItemsTable } from "../components/PopularItemsTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  DollarSign,
  Receipt,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Boxes,
  Truck,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

export const ReportsDashboardPage: React.FC = () => {
  const [preset, setPreset] = useState<DatePreset>("LAST_7_DAYS");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const {
    dashboardData,
    salesData,
    popularItems,
  } = useReports(preset, startDate, endDate);

  const sales = dashboardData?.sales;
  const orders = dashboardData?.orders;
  const payments = dashboardData?.payments || [];
  const inventory = dashboardData?.inventory;
  const procurement = dashboardData?.procurement;
  const dailyTrends = salesData?.daily_trends || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Date Picker */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Business Analytics & Reports</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time executive performance, revenue summaries, popular menu rankings, and operational metrics.
          </p>
        </div>

        <DateRangePicker
          preset={preset}
          startDate={startDate}
          endDate={endDate}
          onPresetChange={(p) => setPreset(p)}
          onCustomRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
      </div>

      {/* Top Level Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SalesKPICard
          title="Net Revenue"
          value={sales ? `$${sales.net_sales}` : "—"}
          subtitle={`Gross: $${sales?.gross_sales || "0.00"}`}
          icon={DollarSign}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />

        <SalesKPICard
          title="Paid & Settled"
          value={sales ? `$${sales.total_paid}` : "—"}
          subtitle={`Due: $${sales?.balance_due || "0.00"}`}
          icon={Receipt}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
        />

        <SalesKPICard
          title="Total Orders"
          value={orders?.total_orders ?? "—"}
          subtitle={`${orders?.completed_orders || 0} completed`}
          icon={ShoppingCart}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
        />

        <SalesKPICard
          title="Avg Order Value"
          value={sales ? `$${sales.average_order_value}` : "—"}
          subtitle={`${sales?.total_bills || 0} invoices issued`}
          icon={TrendingUp}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Sales Trend Chart & Payment Methods Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesTrendChart trends={dailyTrends} />
        </div>
        <div>
          <PaymentBreakdownCard payments={payments} />
        </div>
      </div>

      {/* Best-Selling Dishes & Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PopularItemsTable items={popularItems} />
        </div>

        {/* Operational Health Quick Cards */}
        <div className="space-y-4">
          {/* Inventory Health */}
          <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="h-4 w-4 text-indigo-400" />
                Inventory Stock Status
              </CardTitle>
              <Link to="/inventory">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-indigo-400 hover:text-slate-900 dark:hover:text-white gap-1 px-1.5">
                  View <ArrowRight className="h-2.5 w-2.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-1 text-xs">
              <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Total Active Items:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{inventory?.total_items ?? 0}</span>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> Low Stock Alerts:
                </span>
                <span className="font-mono font-bold text-amber-400">{inventory?.low_stock ?? 0}</span>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <span className="text-rose-400 font-medium">Out of Stock Items:</span>
                <span className="font-mono font-bold text-rose-400">{inventory?.out_of_stock ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Procurement Health */}
          <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-purple-400" />
                Procurement & POs
              </CardTitle>
              <Link to="/procurement/orders">
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-purple-400 hover:text-slate-900 dark:hover:text-white gap-1 px-1.5">
                  View <ArrowRight className="h-2.5 w-2.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-1 text-xs">
              <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Open Purchase Orders:</span>
                <span className="font-mono font-bold text-purple-400">{procurement?.open_purchase_orders ?? 0}</span>
              </div>
              <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Pending Approval:</span>
                <span className="font-mono font-bold text-blue-400">{procurement?.pending_approval ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
