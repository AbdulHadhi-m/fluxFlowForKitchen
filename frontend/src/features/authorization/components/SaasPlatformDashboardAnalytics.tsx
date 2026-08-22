import React, { useState, useMemo } from "react";
import {
  CreditCard,
  Building2,
  TrendingUp,
  HeartPulse,
} from "lucide-react";

type TabType = "SUBSCRIPTIONS" | "PLATFORM_GMV" | "API_TRAFFIC" | "TIERS";
type TimeframeType = "WEEK" | "MONTH" | "YEAR";

export const SaasPlatformDashboardAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("SUBSCRIPTIONS");
  const [timeframe, setTimeframe] = useState<TimeframeType>("WEEK");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate SaaS Platform metrics for the spline chart
  const chartData = useMemo(() => {
    if (activeTab === "SUBSCRIPTIONS") {
      const days = ["FRI", "SAT", "SUN", "MON", "TUE", "WED", "THU"];
      // MRR growth trend
      const mrrBase = [420000, 425000, 430000, 440000, 452000, 458000, 465000];
      return days.map((day, idx) => ({
        label: day,
        date: `Aug ${16 + idx}, 2026`,
        value: mrrBase[idx],
        subLabel: "MRR",
      }));
    }

    if (activeTab === "PLATFORM_GMV") {
      const days = ["FRI", "SAT", "SUN", "MON", "TUE", "WED", "THU"];
      // Multi-tenant aggregate GMV
      const gmvBase = [320000, 480000, 520000, 390000, 610000, 580000, 1015000];
      return days.map((day, idx) => ({
        label: day,
        date: `Aug ${16 + idx}, 2026`,
        value: gmvBase[idx],
        subLabel: "GMV",
      }));
    }

    if (activeTab === "API_TRAFFIC") {
      const days = ["FRI", "SAT", "SUN", "MON", "TUE", "WED", "THU"];
      const reqBase = [142000, 185000, 210000, 168000, 245000, 260000, 320000];
      return days.map((day, idx) => ({
        label: day,
        date: `Aug ${16 + idx}, 2026`,
        value: reqBase[idx],
        subLabel: "Reqs",
      }));
    }

    // TIERS
    return [
      { label: "ENTPR", date: "Enterprise Tier (₹199k/yr)", value: 249000, subLabel: "2 Tenants" },
      { label: "GROWTH", date: "Growth Tier (₹14.9k/mo)", value: 149990, subLabel: "1 Tenant" },
      { label: "START", date: "Starter Trial (Free)", value: 66010, subLabel: "1 Tenant" },
    ];
  }, [activeTab]);

  // SVG Spline Math
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const maxVal = Math.max(...chartData.map((d) => d.value), 100);

  const points = chartData.map((d, i) => {
    const x = chartData.length === 1 ? svgWidth / 2 : paddingX + (i / (chartData.length - 1)) * chartW;
    const y = svgHeight - paddingY - (d.value / maxVal) * chartH;
    return { x, y, ...d };
  });

  const makeSmoothCurve = (pts: typeof points) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const curvePath = makeSmoothCurve(points);
  const areaPath = points.length > 0
    ? `${curvePath} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : "";

  return (
    <div className="space-y-6">
      {/* 1. Overview Section: 4 Emerald Cards with SaaS Platform Base Data */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-600 dark:bg-emerald-400 rounded-full inline-block" />
            Overview
          </h2>
          <span className="text-xs text-slate-400">Refreshed just now</span>
        </div>

        {/* 4 Cards Grid with Platform Base Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Platform MRR */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#10B981] to-[#047857] text-white p-5 shadow-lg shadow-emerald-600/20 flex flex-col justify-between min-h-[125px] group hover:scale-[1.02] transition-all duration-200">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/25">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="pt-3">
              <span className="text-xs text-emerald-100 font-medium block">Platform MRR</span>
              <span className="text-xl sm:text-2xl font-black tracking-tight block font-mono">
                ₹465,000.00
              </span>
            </div>
            <CreditCard className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10 pointer-events-none group-hover:scale-110 transition-transform" />
          </div>

          {/* Card 2: Active Tenants */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#059669] to-[#065F46] text-white p-5 shadow-lg shadow-emerald-700/20 flex flex-col justify-between min-h-[125px] group hover:scale-[1.02] transition-all duration-200">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/25">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="pt-3">
              <span className="text-xs text-emerald-100 font-medium block">Active Restaurants</span>
              <span className="text-xl sm:text-2xl font-black tracking-tight block font-mono">
                4 Tenants (10 Branches)
              </span>
            </div>
            <Building2 className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10 pointer-events-none group-hover:scale-110 transition-transform" />
          </div>

          {/* Card 3: Platform Processed GMV */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#115E59] text-white p-5 shadow-lg shadow-teal-700/20 flex flex-col justify-between min-h-[125px] group hover:scale-[1.02] transition-all duration-200">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/25">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="pt-3">
              <span className="text-xs text-teal-100 font-medium block">Platform GMV (MTD)</span>
              <span className="text-xl sm:text-2xl font-black tracking-tight block font-mono">
                ₹3,915,000.00
              </span>
            </div>
            <TrendingUp className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10 pointer-events-none group-hover:scale-110 transition-transform" />
          </div>

          {/* Card 4: System Health & Uptime */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#134E4A] text-white p-5 shadow-lg shadow-teal-800/20 flex flex-col justify-between min-h-[125px] group hover:scale-[1.02] transition-all duration-200">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/25">
              <HeartPulse className="h-4 w-4" />
            </div>
            <div className="pt-3">
              <span className="text-xs text-teal-100 font-medium block">Platform Health</span>
              <span className="text-xl sm:text-2xl font-black tracking-tight block font-mono">
                99.98% Uptime
              </span>
            </div>
            <HeartPulse className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10 pointer-events-none group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </section>

      {/* 2. Analytics Section with SaaS Platform Metrics & Spline Curve */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-600 dark:bg-emerald-400 rounded-full inline-block" />
            Analytics
          </h2>
        </div>

        {/* Main Analytics Container Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          {/* Top Tab Bar Navigation */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 flex-wrap gap-4">
            <div className="flex items-center gap-8 text-sm font-semibold">
              {[
                { key: "SUBSCRIPTIONS", label: "Subscriptions (MRR)" },
                { key: "PLATFORM_GMV", label: "Platform GMV" },
                { key: "API_TRAFFIC", label: "API Throughput" },
                { key: "TIERS", label: "Tenant Tiers" },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as TabType)}
                    className={`relative pb-3 transition-colors cursor-pointer capitalize ${
                      isActive
                        ? "text-emerald-600 dark:text-emerald-400 font-bold"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full animate-in fade-in" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart Header Row (Trend Title + Timeframe Pills) */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                {activeTab === "SUBSCRIPTIONS" && "SaaS Monthly Recurring Revenue Trend"}
                {activeTab === "PLATFORM_GMV" && "Aggregate Multi-Restaurant GMV Volume"}
                {activeTab === "API_TRAFFIC" && "Global API Request Load & Throughput"}
                {activeTab === "TIERS" && "Subscription Plan Tier Distribution"}
              </span>
            </div>

            {/* Timeframe Toggle Pills (Week | Month | Year) */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-full text-xs font-semibold">
              {(["WEEK", "MONTH", "YEAR"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-1.5 rounded-full transition-all text-xs cursor-pointer capitalize ${
                    timeframe === tf
                      ? "bg-emerald-600 text-white font-bold shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {tf.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Smooth Spline Area Curve SVG Chart */}
          <div className="relative w-full overflow-x-auto select-none pt-2">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-[260px] overflow-visible"
            >
              <defs>
                <linearGradient id="saasSplineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#10B981" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>

                <filter id="saasPointGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10B981" floodOpacity="0.5" />
                </filter>
              </defs>

              {/* Area Fill */}
              {areaPath && <path d={areaPath} fill="url(#saasSplineGradient)" />}

              {/* Curve Stroke Line */}
              {curvePath && (
                <path
                  d={curvePath}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* X-Axis Base Line */}
              <line
                x1={paddingX}
                y1={svgHeight - paddingY}
                x2={svgWidth - paddingX}
                y2={svgHeight - paddingY}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="1.5"
              />

              {/* Data Points on Curve */}
              {points.map((pt, idx) => {
                const isLast = idx === points.length - 1;
                const isHovered = hoveredIndex === idx;

                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Circle Node */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : isLast ? 5 : 4}
                      fill={isLast ? "#EF4444" : isHovered ? "#059669" : "#059669"}
                      stroke="#FFFFFF"
                      strokeWidth={isHovered || isLast ? 2.5 : 1.5}
                      filter={isHovered || isLast ? "url(#saasPointGlow)" : undefined}
                      className="transition-all duration-150"
                    />

                    {/* Day / Label beneath X-axis */}
                    <text
                      x={pt.x}
                      y={svgHeight - paddingY + 20}
                      textAnchor="middle"
                      className="text-[11px] font-bold fill-slate-400 dark:fill-slate-500 font-mono uppercase"
                    >
                      {pt.label}
                    </text>

                    {/* Value Tooltip on Hover */}
                    {isHovered && (
                      <g className="animate-in fade-in zoom-in-95 duration-150">
                        <rect
                          x={pt.x - 55}
                          y={pt.y - 42}
                          width="110"
                          height="30"
                          rx="8"
                          className="fill-slate-900 dark:fill-white"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 23}
                          textAnchor="middle"
                          className="text-[11px] font-black font-mono fill-white dark:fill-slate-900"
                        >
                          {activeTab === "API_TRAFFIC"
                            ? `${pt.value.toLocaleString()} reqs`
                            : `₹${pt.value.toLocaleString()}`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
};
