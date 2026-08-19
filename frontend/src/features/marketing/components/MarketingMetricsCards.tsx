import React from "react";
import { Sparkles, Tag, Gift, Users, TrendingUp, IndianRupee } from "lucide-react";
import { MarketingAnalyticsOverview } from "../types/marketing.types";

interface Props {
  analytics?: MarketingAnalyticsOverview;
  isLoading?: boolean;
}

export const MarketingMetricsCards: React.FC<Props> = ({ analytics, isLoading }) => {
  const cards = [
    {
      label: "Active Promotions",
      value: analytics?.active_promotions_count ?? 0,
      sub: `${analytics?.total_campaigns_count ?? 0} total campaigns`,
      icon: Tag,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Active Coupon Codes",
      value: analytics?.active_coupons_count ?? 0,
      sub: "Available for checkout",
      icon: Gift,
      color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    },
    {
      label: "Total Redemptions",
      value: analytics?.total_redemptions ?? 0,
      sub: `Across all orders`,
      icon: Sparkles,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Discounts Awarded",
      value: `₹${analytics?.total_discount_given ?? "0.00"}`,
      sub: "Promotional cost",
      icon: IndianRupee,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Influenced Revenue",
      value: `₹${analytics?.promotional_revenue_influenced ?? "0.00"}`,
      sub: "Orders with promotions",
      icon: TrendingUp,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      label: "Customer Segments",
      value: analytics?.total_segments_count ?? 0,
      sub: "Audience groups configured",
      icon: Users,
      color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{card.label}</span>
              <div className={`p-1.5 rounded-lg border shrink-0 ${card.color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isLoading ? <span className="animate-pulse text-slate-600">...</span> : card.value}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">{card.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
