import React from "react";
import { DailySalesTrend } from "../types/reports.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface SalesTrendChartProps {
  trends: DailySalesTrend[];
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ trends }) => {
  const maxSales = Math.max(...trends.map((t) => parseFloat(t.net_sales) || 0), 100);

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Daily Revenue Trend ($)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {trends.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No sales recorded during this date range.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="grid grid-flow-col auto-cols-fr gap-2 items-end h-40 pt-4 px-2 bg-slate-100/80 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80">
              {trends.map((t, idx) => {
                const amount = parseFloat(t.net_sales) || 0;
                const heightPercent = Math.max((amount / maxSales) * 100, 4);

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 group h-full justify-end">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-900 dark:text-white px-1.5 py-0.5 rounded font-mono shadow-lg border border-slate-300 dark:border-slate-700 whitespace-nowrap -translate-y-1">
                      ${t.net_sales} ({t.order_count} orders)
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[28px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md group-hover:from-emerald-500 group-hover:to-emerald-400 transition-all duration-300 shadow-sm shadow-indigo-600/30"
                    />
                    <span className="text-[9px] font-mono text-slate-500 truncate w-full text-center">
                      {t.date.split("-").slice(1).join("/")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
