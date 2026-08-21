import React, { useState } from "react";
import { useReports } from "../hooks/useReports";
import { DatePreset } from "../types/reports.types";
import { DateRangePicker } from "../components/DateRangePicker";
import { SalesKPICard } from "../components/SalesKPICard";
import { SalesTrendChart } from "../components/SalesTrendChart";
import { PaymentBreakdownCard } from "../components/PaymentBreakdownCard";
import { HourlyRushHoursChart } from "../components/HourlyRushHoursChart";
import { CategoryContributionChart } from "../components/CategoryContributionChart";
import { OrderFulfillmentCard } from "../components/OrderFulfillmentCard";
import { PopularItemsTable } from "../components/PopularItemsTable";
import { ExportReportMenu } from "../components/ExportReportMenu";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  IndianRupee,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Boxes,
  Truck,
  ArrowRight,
  ShieldCheck,
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
  const categories = dashboardData?.categories || salesData?.categories || [];
  const hourlyTrends = dashboardData?.hourly_trends || salesData?.hourly_trends || [];
  const dailyTrends = salesData?.daily_trends || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Date Picker & Export Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Business Analytics & Reports
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Executive revenue analytics, peak kitchen rush velocity, menu intelligence & financial KPIs
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

          <ExportReportMenu
            preset={preset}
            startDate={startDate}
            endDate={endDate}
            dashboardData={dashboardData}
            dailyTrends={dailyTrends}
            popularItems={popularItems}
          />
        </div>
      </div>

      {/* Top Level Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SalesKPICard
          title="Net Revenue"
          value={sales ? `₹${sales.net_sales}` : "—"}
          subtitle={`Gross: ₹${sales?.gross_sales || "0.00"}`}
          icon={IndianRupee}
          iconColor="text-emerald-500 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />

        <SalesKPICard
          title="Paid & Settled"
          value={sales ? `₹${sales.total_paid}` : "—"}
          subtitle={`Due: ₹${sales?.balance_due || "0.00"}`}
          icon={Receipt}
          iconColor="text-blue-500 dark:text-blue-400"
          iconBg="bg-blue-500/10"
        />

        <SalesKPICard
          title="Total Orders"
          value={orders?.total_orders ?? "—"}
          subtitle={`${orders?.completed_orders || 0} completed (${orders?.completion_rate ?? 100}% rate)`}
          icon={ShoppingCart}
          iconColor="text-purple-500 dark:text-purple-400"
          iconBg="bg-purple-500/10"
        />

        <SalesKPICard
          title="Avg Order Value"
          value={sales ? `₹${sales.average_order_value}` : "—"}
          subtitle={`${sales?.total_bills || 0} invoices settled`}
          icon={TrendingUp}
          iconColor="text-amber-500 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Primary Graphs Row: Revenue Trajectory & Payment Tenders Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesTrendChart trends={dailyTrends} />
        </div>
        <div>
          <PaymentBreakdownCard payments={payments} />
        </div>
      </div>

      {/* Secondary Graphs Row: Kitchen Rush Hours Heatmap & Order Fulfillment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <HourlyRushHoursChart hourlyTrends={hourlyTrends} />
        </div>
        <div>
          <OrderFulfillmentCard orders={orders} />
        </div>
      </div>

      {/* Tertiary Graphs Row: Top-Selling Dishes & Category Product Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PopularItemsTable items={popularItems} />
        </div>
        <div>
          <CategoryContributionChart categories={categories} />
        </div>
      </div>

      {/* Operational Health & Stock Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inventory Health */}
        <Card className="bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                <Boxes className="h-4 w-4" />
              </div>
              Inventory & Raw Materials Health
            </CardTitle>
            <Link to="/inventory">
              <Button variant="ghost" size="sm" className="h-6 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 gap-1 px-2">
                Manage Stock <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Total Items</span>
                <span className="font-mono font-black text-lg text-slate-900 dark:text-white">{inventory?.total_items ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <span className="text-[10px] text-amber-500 uppercase font-semibold block mb-1">Low Stock Alerts</span>
                <span className="font-mono font-black text-lg text-amber-500">{inventory?.low_stock ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <span className="text-[10px] text-rose-500 uppercase font-semibold block mb-1">Out of Stock</span>
                <span className="font-mono font-black text-lg text-rose-500">{inventory?.out_of_stock ?? 0}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Stock Availability Rate
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {inventory?.total_items && inventory.total_items > 0
                  ? `${(((inventory.total_items - (inventory.out_of_stock || 0)) / inventory.total_items) * 100).toFixed(0)}%`
                  : "100%"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Procurement Health */}
        <Card className="bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 dark:text-purple-400">
                <Truck className="h-4 w-4" />
              </div>
              Procurement & Purchasing Orders
            </CardTitle>
            <Link to="/procurement/orders">
              <Button variant="ghost" size="sm" className="h-6 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 gap-1 px-2">
                View Orders <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20">
                <span className="text-[10px] text-purple-500 uppercase font-semibold block mb-1">Open Purchase Orders</span>
                <span className="font-mono font-black text-lg text-purple-600 dark:text-purple-400">{procurement?.open_purchase_orders ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <span className="text-[10px] text-blue-500 uppercase font-semibold block mb-1">Awaiting Approval</span>
                <span className="font-mono font-black text-lg text-blue-600 dark:text-blue-400">{procurement?.pending_approval ?? 0}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Pipeline Status</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {(procurement?.open_purchase_orders ?? 0) === 0 ? "All Orders Fulfilled" : "Active Requisitions In Progress"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

