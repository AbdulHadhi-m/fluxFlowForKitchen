import React from "react";
import { MembershipTier } from "../types/loyalty.types";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Zap, Percent } from "lucide-react";

export const MembershipTiersTable: React.FC<{ tiers: MembershipTier[] }> = ({ tiers }) => {
  if (tiers.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-500 bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
        No membership tiers defined.
      </div>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 overflow-hidden">
      <CardContent className="p-0">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-950/80 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Tier Name</th>
              <th className="px-4 py-3 text-right">Spend Threshold</th>
              <th className="px-4 py-3 text-center">Points Multiplier</th>
              <th className="px-4 py-3 text-right">Member Discount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {tiers.map((t) => (
              <tr key={t.id} className="hover:bg-slate-200/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                  #{t.rank}
                </td>
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  {t.name}
                </td>
                <td className="px-4 py-3 text-right font-black text-slate-700 dark:text-slate-200">
                  ${t.qualification_spend}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                    <Zap className="h-3 w-3" /> {t.points_multiplier}x
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-300 font-bold">
                  {parseFloat(t.discount_percentage) > 0 ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Percent className="h-3 w-3" /> {t.discount_percentage}%
                    </span>
                  ) : (
                    <span className="text-slate-500">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
