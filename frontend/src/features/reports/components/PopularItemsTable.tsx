import React, { useState } from "react";
import { PopularMenuItem } from "../types/reports.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Award, UtensilsCrossed, BarChart3, ListOrdered } from "lucide-react";

interface PopularItemsTableProps {
  items: PopularMenuItem[];
}

export const PopularItemsTable: React.FC<PopularItemsTableProps> = ({ items }) => {
  const [viewMode, setViewMode] = useState<"TABLE" | "BARS">("BARS");

  const maxRevenue = Math.max(...items.map((i) => parseFloat(i.revenue) || 0), 100);
  const totalRevenue = items.reduce((sum, i) => sum + (parseFloat(i.revenue) || 0), 0);

  const getRankBadge = (idx: number) => {
    switch (idx) {
      case 0:
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1 border border-amber-500/30">
            🥇 #1 Top Seller
          </span>
        );
      case 1:
        return (
          <span className="px-2 py-0.5 rounded-full bg-slate-400/20 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center gap-1 border border-slate-400/30">
            🥈 #2
          </span>
        );
      case 2:
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-700 dark:text-amber-400 font-bold text-[10px] flex items-center gap-1 border border-amber-700/30">
            🥉 #3
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-mono text-[10px]">
            #{idx + 1}
          </span>
        );
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Top-Selling Dishes & Performance Matrix
              </CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Menu item volume rankings and revenue contribution
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode("BARS")}
              className={`p-1.5 rounded-md font-semibold transition-all ${
                viewMode === "BARS"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Bar Chart View"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`p-1.5 rounded-md font-semibold transition-all ${
                viewMode === "TABLE"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              title="Table View"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {items.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
            No item sales recorded in this period.
          </div>
        ) : viewMode === "BARS" ? (
          /* Visual Horizontal Ranking Bars */
          <div className="space-y-3">
            {items.map((item, idx) => {
              const rev = parseFloat(item.revenue) || 0;
              const revPercent = maxRevenue > 0 ? (rev / maxRevenue) * 100 : 0;
              const shareOfTotal = totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {getRankBadge(idx)}
                      <span className="font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                        {item.item_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 font-mono text-right flex-shrink-0">
                      <span className="text-[11px] text-slate-500">
                        {item.quantity_sold} sold ({item.order_count} ord)
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{item.revenue}
                      </span>
                    </div>
                  </div>

                  {/* Dual comparative visual bar (Revenue % & Share %) */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${revPercent}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0
                            ? "bg-gradient-to-r from-amber-500 to-emerald-400"
                            : idx === 1
                            ? "bg-gradient-to-r from-blue-500 to-teal-400"
                            : "bg-gradient-to-r from-emerald-600 to-teal-400"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Velocity: {item.quantity_sold} portions</span>
                      <span>{shareOfTotal.toFixed(1)}% of menu revenue</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Data Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/80 font-semibold">
                <tr>
                  <th className="pb-2.5 pl-1">#</th>
                  <th className="pb-2.5">Item Name</th>
                  <th className="pb-2.5 text-center">Qty Sold</th>
                  <th className="pb-2.5 text-center">Orders</th>
                  <th className="pb-2.5 text-right pr-1">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40 text-slate-600 dark:text-slate-300">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 pl-1">{getRankBadge(idx)}</td>
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-slate-400" />
                      {item.item_name}
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-300">
                      {item.quantity_sold}
                    </td>
                    <td className="py-2.5 text-center font-mono text-slate-500 dark:text-slate-400">
                      {item.order_count}
                    </td>
                    <td className="py-2.5 text-right pr-1 font-mono font-bold text-emerald-500 dark:text-emerald-400">
                      ₹{item.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
