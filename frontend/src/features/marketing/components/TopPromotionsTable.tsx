import React from "react";
import { Tag, Gift } from "lucide-react";
import { MarketingAnalyticsOverview } from "../types/marketing.types";

interface Props {
  analytics?: MarketingAnalyticsOverview;
}

export const TopPromotionsTable: React.FC<Props> = ({ analytics }) => {
  const topPromos = analytics?.top_promotions || [];
  const topCoupons = analytics?.top_coupons || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top Promotions */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Tag className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Performing Promotions</h3>
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">By Redemptions</span>
        </div>

        {topPromos.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No promotion redemptions recorded yet.</div>
        ) : (
          <div className="space-y-2">
            {topPromos.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/50 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-500 font-bold text-[10px]">#{idx + 1}</span>
                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-200">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.type.replace(/_/g, " ")}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400">{p.redemptions} uses</div>
                  <div className="text-[10px] text-slate-500">₹{p.total_discount} off</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Coupons */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Gift className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Vouchers & Coupon Codes</h3>
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">By Usage</span>
        </div>

        {topCoupons.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No coupon redemptions recorded yet.</div>
        ) : (
          <div className="space-y-2">
            {topCoupons.map((c, idx) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/50 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-500 font-bold text-[10px]">#{idx + 1}</span>
                  <div>
                    <div className="font-mono font-bold text-teal-400 tracking-wider">{c.code}</div>
                    <div className="text-[10px] text-slate-500">{c.promotion_name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-teal-600 dark:text-teal-300">{c.redemptions} uses</div>
                  <div className="text-[10px] text-slate-500">₹{c.total_discount} off</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
