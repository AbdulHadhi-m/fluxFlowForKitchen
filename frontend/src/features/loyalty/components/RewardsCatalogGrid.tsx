import React from "react";
import { Reward } from "../types/loyalty.types";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, Tag } from "lucide-react";

export const RewardsCatalogGrid: React.FC<{ rewards: Reward[] }> = ({ rewards }) => {
  if (rewards.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-500 bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
        No active rewards catalog items.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rewards.map((r) => (
        <Card key={r.id} className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Gift className="h-4 w-4" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                {r.points_cost} Points
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{r.name}</h4>
              {r.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{r.description}</p>}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-slate-500" />
                {r.reward_type.replace(/_/g, " ")}
              </span>
              {parseFloat(r.min_order_value) > 0 && (
                <span>Min spend: ${r.min_order_value}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
