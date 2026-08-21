import React from "react";
import { CategorySalesItem } from "../types/reports.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Layers, Utensils } from "lucide-react";

interface CategoryContributionChartProps {
  categories?: CategorySalesItem[];
}

const CATEGORY_COLORS = [
  { bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500/30", bar: "from-emerald-600 to-teal-400" },
  { bg: "bg-blue-500", text: "text-blue-500", border: "border-blue-500/30", bar: "from-blue-600 to-cyan-400" },
  { bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-500/30", bar: "from-purple-600 to-pink-400" },
  { bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500/30", bar: "from-amber-600 to-orange-400" },
  { bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500/30", bar: "from-rose-600 to-red-400" },
];

export const CategoryContributionChart: React.FC<CategoryContributionChartProps> = ({ categories = [] }) => {

  return (
    <Card className="bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Category Sales & Product Mix
              </CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Revenue contribution and item distribution across catalog categories
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200">
            {categories.length} Categories
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {categories.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            Category distribution will appear here once menu sales are recorded.
          </div>
        ) : (
          <>
            {/* Multi-Segment Stacked Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
                {categories.map((c, idx) => {
                  const pct = parseFloat(c.percentage) || 0;
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  if (pct <= 0) return null;

                  return (
                    <div
                      key={idx}
                      style={{ width: `${pct}%` }}
                      className={`h-full ${color.bg} transition-all duration-500 first:rounded-l-full last:rounded-r-full hover:opacity-80`}
                      title={`${c.category_name}: ${pct}% (₹${c.total_revenue})`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Detailed Category Rows */}
            <div className="space-y-2.5 pt-1">
              {categories.map((c, idx) => {
                const pct = parseFloat(c.percentage) || 0;
                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all"
                  >
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Utensils className="h-3 w-3 text-slate-400" />
                          {c.category_name}
                        </span>
                        <span className="text-[10px] text-slate-400">({c.quantity_sold} sold)</span>
                      </div>
                      <div className="font-mono text-right flex items-center gap-2">
                        <span className="text-slate-900 dark:text-white font-bold">₹{c.total_revenue}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-[10px] text-slate-600 dark:text-slate-300">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Fill Bar */}
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full bg-gradient-to-r ${color.bar} rounded-full transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
