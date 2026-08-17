import React from "react";
import { Link } from "react-router-dom";
import { Tag, Gift, Users, Send, ArrowRight, Sparkles, Plus } from "lucide-react";
import { useMarketingAnalytics, usePromotions } from "../hooks/useMarketing";
import { MarketingMetricsCards } from "../components/MarketingMetricsCards";
import { TopPromotionsTable } from "../components/TopPromotionsTable";
import { PromotionCard } from "../components/PromotionCard";

export const MarketingDashboardPage: React.FC = () => {
  const { data: analytics, isLoading: isAnalyticsLoading } = useMarketingAnalytics();
  const { data: promotions, isLoading: isPromosLoading } = usePromotions();

  const activePromos = (promotions || []).filter((p) => p.status === "ACTIVE").slice(0, 3);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Marketing & Promotions</h1>
          </div>
          <p className="text-xs text-slate-400">
            Automated discount rules, customer segments, voucher codes, and campaign broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/marketing/promotions/new"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Promotion</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <MarketingMetricsCards analytics={analytics} isLoading={isAnalyticsLoading} />

      {/* Navigation Quick Access Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          to="/marketing/promotions"
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Promotions</div>
              <div className="text-[10px] text-slate-500">Discount rules & caps</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
        </Link>

        <Link
          to="/marketing/coupons"
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-violet-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
              <Gift className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">Coupons</div>
              <div className="text-[10px] text-slate-500">Single & bulk vouchers</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
        </Link>

        <Link
          to="/marketing/segments"
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-pink-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">Segments</div>
              <div className="text-[10px] text-slate-500">Audience targeting</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-pink-400 transition-colors" />
        </Link>

        <Link
          to="/marketing/campaigns"
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">Campaigns</div>
              <div className="text-[10px] text-slate-500">Broadcasts & alerts</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
        </Link>
      </div>

      {/* Performance Analytics Grid */}
      <TopPromotionsTable analytics={analytics} />

      {/* Featured Active Promotions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Tag className="h-4 w-4 text-indigo-400" />
            <span>Currently Active Promotions</span>
          </h3>
          <Link to="/marketing/promotions" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
            View All ({promotions?.length ?? 0}) →
          </Link>
        </div>

        {isPromosLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : activePromos.length === 0 ? (
          <div className="py-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500">
            No promotions are currently active. Click "Create Promotion" above to launch one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activePromos.map((p) => (
              <PromotionCard key={p.id} promotion={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
