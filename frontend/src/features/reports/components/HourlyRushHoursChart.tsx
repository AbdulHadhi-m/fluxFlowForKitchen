import React, { useState } from "react";
import { HourlySalesTrend } from "../types/reports.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock, Flame, Zap, Sun, Moon, Coffee } from "lucide-react";

interface HourlyRushHoursChartProps {
  hourlyTrends?: HourlySalesTrend[];
}

export const HourlyRushHoursChart: React.FC<HourlyRushHoursChartProps> = ({ hourlyTrends = [] }) => {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Generate 24 hours (or standard 08:00 - 23:00) with real data merged
  const fullHours = Array.from({ length: 24 }, (_, h) => {
    const found = hourlyTrends.find((t) => t.hour === h);
    return {
      hour: h,
      net_sales: found ? parseFloat(found.net_sales) || 0 : 0,
      order_count: found ? found.order_count : 0,
    };
  });

  const maxRevenue = Math.max(...fullHours.map((h) => h.net_sales), 100);
  const maxOrders = Math.max(...fullHours.map((h) => h.order_count), 1);

  // Find peak hour
  const peakHourObj = [...fullHours].sort((a, b) => b.net_sales - a.net_sales)[0];
  const hasData = fullHours.some((h) => h.net_sales > 0 || h.order_count > 0);

  // Format 24h to 12h AM/PM
  const formatHour = (h: number) => {
    if (h === 0) return "12am";
    if (h < 12) return `${h}am`;
    if (h === 12) return "12pm";
    return `${h - 12}pm`;
  };

  const getRushLevel = (amount: number, orders: number) => {
    const ratio = Math.max(amount / maxRevenue, orders / maxOrders);
    if (ratio >= 0.75) return { label: "Peak Rush", color: "from-rose-500 to-amber-500", text: "text-rose-500", bg: "bg-rose-500/10" };
    if (ratio >= 0.4) return { label: "Busy", color: "from-amber-500 to-yellow-400", text: "text-amber-500", bg: "bg-amber-500/10" };
    if (ratio > 0) return { label: "Normal", color: "from-emerald-500 to-teal-400", text: "text-emerald-500", bg: "bg-emerald-500/10" };
    return { label: "Quiet", color: "from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700", text: "text-slate-400", bg: "bg-slate-100" };
  };

  return (
    <Card className="bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Kitchen Rush Hours & Peak Volume (Heatmap)
              </CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Order density and hourly revenue distribution across 24h kitchen operations
              </p>
            </div>
          </div>

          {peakHourObj && peakHourObj.net_sales > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold self-start sm:self-auto">
              <Flame className="h-3.5 w-3.5" />
              Peak Trading: {formatHour(peakHourObj.hour)} (₹{peakHourObj.net_sales.toFixed(0)})
            </div>
          )}
        </div>

        {/* Daypart summary badges */}
        <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Coffee className="h-3 w-3 text-amber-400" /> Breakfast (7-11)
          </span>
          <span className="flex items-center gap-1">
            <Sun className="h-3 w-3 text-orange-400" /> Lunch Rush (12-15)
          </span>
          <span className="flex items-center gap-1">
            <Moon className="h-3 w-3 text-purple-400" /> Dinner Peak (19-22)
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {!hasData ? (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            Hourly transaction patterns will appear here as orders are placed.
          </div>
        ) : (
          <div>
            {/* 24-hour Bar Grid */}
            <div className="grid grid-flow-col auto-cols-fr gap-1.5 items-end h-36 pt-4 px-2 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800/80">
              {fullHours.map((hData) => {
                const heightPercent = hData.net_sales > 0 ? Math.max((hData.net_sales / maxRevenue) * 100, 10) : 4;
                const isHovered = hoveredHour === hData.hour;
                const rush = getRushLevel(hData.net_sales, hData.order_count);

                return (
                  <div
                    key={hData.hour}
                    onMouseEnter={() => setHoveredHour(hData.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                    className="flex flex-col items-center gap-1 h-full justify-end group cursor-pointer"
                  >
                    {/* Hover Floating Tooltip */}
                    <div
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded shadow-lg transition-all ${
                        isHovered
                          ? "opacity-100 bg-slate-900 text-white dark:bg-white dark:text-slate-900 -translate-y-1 z-10"
                          : "opacity-0 pointer-events-none"
                      }`}
                    >
                      {formatHour(hData.hour)}: ₹{hData.net_sales.toFixed(0)} ({hData.order_count} ord)
                    </div>

                    {/* Gradient Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[20px] rounded-t-md bg-gradient-to-t ${rush.color} transition-all duration-300 ${
                        isHovered ? "ring-2 ring-amber-400 scale-105 shadow-md" : ""
                      } ${hData.net_sales === 0 ? "opacity-30" : "opacity-90 hover:opacity-100"}`}
                    />

                    {/* Hour Axis Label (every 2-3 hours) */}
                    <span
                      className={`text-[8px] font-mono truncate w-full text-center transition-colors ${
                        isHovered
                          ? "text-amber-500 font-bold"
                          : hData.hour % 3 === 0
                          ? "text-slate-500 dark:text-slate-400 font-medium"
                          : "text-transparent"
                      }`}
                    >
                      {formatHour(hData.hour)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Hover details callout */}
            {hoveredHour !== null && (
              <div className="mt-2.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs animate-in fade-in duration-150">
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Hour {formatHour(hoveredHour)}
                </span>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span className="text-emerald-500 font-bold">
                    ₹{fullHours[hoveredHour].net_sales.toFixed(2)}
                  </span>
                  <span className="text-slate-500">
                    {fullHours[hoveredHour].order_count} Orders
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRushLevel(fullHours[hoveredHour].net_sales, fullHours[hoveredHour].order_count).bg} ${getRushLevel(fullHours[hoveredHour].net_sales, fullHours[hoveredHour].order_count).text}`}>
                    {getRushLevel(fullHours[hoveredHour].net_sales, fullHours[hoveredHour].order_count).label}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
