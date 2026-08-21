import React from "react";
import { OrdersSummary } from "../types/reports.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface OrderFulfillmentCardProps {
  orders?: OrdersSummary;
}

export const OrderFulfillmentCard: React.FC<OrderFulfillmentCardProps> = ({ orders }) => {
  const total = orders?.total_orders || 0;
  const completed = orders?.completed_orders || 0;
  const active = orders?.active_orders || 0;
  const cancelled = orders?.cancelled_orders || 0;

  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  const activeRate = total > 0 ? (active / total) * 100 : 0;
  const cancelRate = total > 0 ? (cancelled / total) * 100 : 0;

  // SVG Circular Gauge
  const size = 110;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const completedDashoffset = circumference - (completionRate / 100) * circumference;

  return (
    <Card className="bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          Order Fulfillment & Velocity
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Circular Gauge & Status */}
        <div className="flex items-center justify-around gap-2">
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
              {/* Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-100 dark:text-slate-950"
              />
              {/* Progress */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#10b981"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={completedDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                {completionRate.toFixed(0)}%
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
                Fulfilled
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed:
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{completed}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                <Clock className="h-3.5 w-3.5" /> In-Prep / Active:
              </span>
              <span className="font-mono font-bold text-amber-500">{active}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-rose-500 font-medium">
                <XCircle className="h-3.5 w-3.5" /> Void / Cancelled:
              </span>
              <span className="font-mono font-bold text-rose-500">{cancelled}</span>
            </div>
          </div>
        </div>

        {/* Stacked fulfillment ratio bar */}
        <div className="space-y-1">
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex">
            <div style={{ width: `${completionRate}%` }} className="h-full bg-emerald-500 transition-all duration-500" />
            <div style={{ width: `${activeRate}%` }} className="h-full bg-amber-500 transition-all duration-500" />
            <div style={{ width: `${cancelRate}%` }} className="h-full bg-rose-500 transition-all duration-500" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>{total} Total Placed</span>
            <span className="text-emerald-500 font-semibold">{completed} Success</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
