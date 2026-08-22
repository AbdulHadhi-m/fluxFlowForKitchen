import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  TrendingUp,
  Calendar,
  Building2,
} from "lucide-react";

export const PlatformSubscriptionsPage: React.FC = () => {
  const subscriptions = [
    {
      id: "sub-101",
      restaurantName: "The Olive Garden Bistro",
      tier: "Enterprise Tier",
      billingCycle: "Annual (₹199,000/yr)",
      renewalDate: "Jan 15, 2027",
      status: "Active",
      paymentMethod: "HDFC Corp Card ···· 8842",
      usageQuota: "4 / 10 Branches (40%)",
    },
    {
      id: "sub-102",
      restaurantName: "Saffron Spice Kitchen & Grill",
      tier: "Growth Tier",
      billingCycle: "Monthly (₹14,999/mo)",
      renewalDate: "Sep 02, 2026",
      status: "Active",
      paymentMethod: "ICICI Auto-Debit ···· 4120",
      usageQuota: "2 / 3 Branches (66%)",
    },
    {
      id: "sub-103",
      restaurantName: "Urban Crust Pizzeria",
      tier: "Starter Tier",
      billingCycle: "14-Day Free Trial",
      renewalDate: "Aug 24, 2026",
      status: "Trial (2 days left)",
      paymentMethod: "Pending Setup",
      usageQuota: "1 / 1 Branch (100%)",
    },
    {
      id: "sub-104",
      restaurantName: "Royal Rajputana Fine Dining",
      tier: "Enterprise Tier",
      billingCycle: "Annual (₹249,000/yr)",
      renewalDate: "Nov 20, 2026",
      status: "Active",
      paymentMethod: "Axis Bank NEFT",
      usageQuota: "3 / 5 Branches (60%)",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            SaaS Subscriptions & Tenant Billing Monitor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            SaaS Owner responsibility: Monitor platform recurring revenue (MRR), subscription lifecycles, and plan quotas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs">
            MRR: ₹465,000
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Monthly Recurring Revenue</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">₹465,000</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Active Paid Subscriptions</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">3 Tenants</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Active Trials</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">1 Tenant</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
            Active Restaurant Subscriptions
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Restaurant Organization</th>
                <th className="py-3 px-4 font-semibold">Plan & Pricing</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Renewal Date</th>
                <th className="py-3 px-4 font-semibold">Branch Quota</th>
                <th className="py-3 px-4 font-semibold">Payment Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{sub.restaurantName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{sub.id}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{sub.tier}</div>
                    <div className="text-[10px] text-slate-500">{sub.billingCycle}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        sub.status.includes("Active")
                          ? "text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-500/10"
                          : "text-amber-600 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-500/10"
                      }`}
                    >
                      {sub.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                    {sub.renewalDate}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                    {sub.usageQuota}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                    {sub.paymentMethod}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
