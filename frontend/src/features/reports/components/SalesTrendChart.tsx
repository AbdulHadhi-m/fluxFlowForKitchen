import React, { useState } from "react";
import { DailySalesTrend } from "../types/reports.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, BarChart2, Activity, Calendar, ArrowUpRight, Layers } from "lucide-react";

interface SalesTrendChartProps {
  trends: DailySalesTrend[];
}

type ChartView = "AREA" | "BARS" | "COMPARE";
type MetricType = "NET" | "GROSS" | "ORDERS";

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ trends }) => {
  const [chartView, setChartView] = useState<ChartView>("AREA");
  const [metric, setMetric] = useState<MetricType>("NET");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // If empty or single item, fill default days for consistent grid
  const data = trends.length > 0 ? trends : [];

  const values = data.map((t) => {
    if (metric === "GROSS") return parseFloat(t.gross_sales) || 0;
    if (metric === "ORDERS") return t.order_count || 0;
    return parseFloat(t.net_sales) || 0;
  });

  const maxValue = Math.max(...values, metric === "ORDERS" ? 5 : 100);
  const totalMetric = values.reduce((a, b) => a + b, 0);
  const avgMetric = values.length > 0 ? totalMetric / values.length : 0;

  // Find peak index
  const peakIdx = values.length > 0 ? values.indexOf(Math.max(...values)) : -1;

  // SVG dimensions for Area Chart
  const svgWidth = 600;
  const svgHeight = 180;
  const paddingX = 30;
  const paddingY = 20;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  // Compute coordinates for line/area
  const points = data.map((_, i) => {
    const x = data.length === 1 ? svgWidth / 2 : paddingX + (i / (data.length - 1)) * chartW;
    const val = values[i];
    const y = svgHeight - paddingY - (val / maxValue) * chartH;
    return { x, y, val, item: data[i] };
  });

  // Construct SVG Bezier Smooth Path
  const makeSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpX = (curr.x + next.x) / 2;
      path += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const linePath = makeSmoothPath(points);
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : "";

  return (
    <Card className="bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Revenue & Sales Trajectory
              </CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {metric === "ORDERS" ? "Order volume trends" : "Financial velocity and daily revenue breakdown"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Metric Switcher */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setMetric("NET")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  metric === "NET"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Net Sales
              </button>
              <button
                type="button"
                onClick={() => setMetric("GROSS")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  metric === "GROSS"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Gross
              </button>
              <button
                type="button"
                onClick={() => setMetric("ORDERS")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  metric === "ORDERS"
                    ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Orders
              </button>
            </div>

            {/* Chart Type Selector */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setChartView("AREA")}
                title="Smooth Curve"
                className={`p-1.5 rounded-md transition-all ${
                  chartView === "AREA"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartView("BARS")}
                title="Bar Chart"
                className={`p-1.5 rounded-md transition-all ${
                  chartView === "BARS"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartView("COMPARE")}
                title="Comparative View"
                className={`p-1.5 rounded-md transition-all ${
                  chartView === "COMPARE"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        {data.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Period Total:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {metric === "ORDERS" ? `${totalMetric} orders` : `₹${totalMetric.toFixed(2)}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Daily Average:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {metric === "ORDERS" ? `${avgMetric.toFixed(1)}/day` : `₹${avgMetric.toFixed(2)}`}
              </span>
            </div>
            {peakIdx >= 0 && (
              <div className="flex items-center gap-1.5 justify-end">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  <ArrowUpRight className="h-3 w-3" /> Peak: {data[peakIdx].date.split("-").slice(1).join("/")} (
                  {metric === "ORDERS" ? `${values[peakIdx]}` : `₹${values[peakIdx]}`})
                </span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
            <Calendar className="h-7 w-7 text-slate-400 opacity-50" />
            <span>No sales data recorded for the selected date range.</span>
          </div>
        ) : chartView === "AREA" ? (
          /* High-Quality Interactive SVG Area & Line Chart */
          <div className="relative">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-48 overflow-visible"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <defs>
                {/* Area Gradient */}
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="#10b981" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                {/* Line Gradient */}
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                {/* Drop Glow Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10b981" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingY + ratio * chartH;
                const labelVal = maxValue * (1 - ratio);
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800/80"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[9px] font-mono fill-slate-400 dark:fill-slate-500"
                    >
                      {metric === "ORDERS" ? Math.round(labelVal) : `₹${Math.round(labelVal)}`}
                    </text>
                  </g>
                );
              })}

              {/* Gradient Area Fill */}
              {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

              {/* Line Stroke */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
              )}

              {/* Interactive Data Points & Hover Targets */}
              {points.map((pt, i) => {
                const isHovered = hoveredIdx === i;
                const isPeak = i === peakIdx;

                return (
                  <g
                    key={i}
                    onMouseEnter={() => setHoveredIdx(i)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    {/* Hover Vertical Guide Line */}
                    {isHovered && (
                      <line
                        x1={pt.x}
                        y1={paddingY}
                        x2={pt.x}
                        y2={svgHeight - paddingY}
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                        opacity="0.8"
                      />
                    )}

                    {/* Outer pulse ring for Peak or Hover */}
                    {(isHovered || isPeak) && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? "7" : "5"}
                        fill="#10b981"
                        fillOpacity="0.2"
                        className="animate-pulse"
                      />
                    )}

                    {/* Point Circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? "4.5" : isPeak ? "3.5" : "2.5"}
                      fill={isHovered ? "#10b981" : "#ffffff"}
                      stroke="#10b981"
                      strokeWidth="2"
                    />

                    {/* Date Label on X Axis */}
                    <text
                      x={pt.x}
                      y={svgHeight - 4}
                      textAnchor="middle"
                      className={`text-[9px] font-mono transition-colors ${
                        isHovered
                          ? "fill-emerald-600 dark:fill-emerald-400 font-bold"
                          : "fill-slate-400 dark:fill-slate-500"
                      }`}
                    >
                      {pt.item.date.split("-").slice(1).join("/")}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Floating Active Tooltip */}
            {hoveredIdx !== null && points[hoveredIdx] && (
              <div
                className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl bg-slate-900/95 text-white dark:bg-slate-950/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs transition-all duration-150 space-y-0.5"
                style={{
                  left: `${(points[hoveredIdx].x / svgWidth) * 100}%`,
                  top: `${(points[hoveredIdx].y / svgHeight) * 100 - 8}%`,
                }}
              >
                <div className="text-[10px] text-slate-400 font-medium">
                  {points[hoveredIdx].item.date}
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-emerald-400 font-bold text-sm">
                    {metric === "ORDERS"
                      ? `${points[hoveredIdx].item.order_count} Orders`
                      : `₹${points[hoveredIdx].val.toFixed(2)}`}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-0.5 flex justify-between gap-3 font-mono">
                  <span>Gross: ₹{points[hoveredIdx].item.gross_sales}</span>
                  <span>Orders: {points[hoveredIdx].item.order_count}</span>
                </div>
              </div>
            )}
          </div>
        ) : chartView === "BARS" ? (
          /* Modern Gradient Bar Visualization */
          <div className="space-y-3">
            <div className="grid grid-flow-col auto-cols-fr gap-2 items-end h-44 pt-4 px-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800/80">
              {data.map((t, idx) => {
                const amount = values[idx];
                const heightPercent = Math.max((amount / maxValue) * 100, 5);
                const isPeak = idx === peakIdx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="flex flex-col items-center gap-1.5 group h-full justify-end cursor-pointer"
                  >
                    <div
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-all shadow-sm ${
                        hoveredIdx === idx
                          ? "opacity-100 bg-slate-900 text-white dark:bg-white dark:text-slate-900 -translate-y-1"
                          : "opacity-0 group-hover:opacity-100 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {metric === "ORDERS" ? `${amount} orders` : `₹${amount.toFixed(0)}`}
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 shadow-sm ${
                        isPeak
                          ? "bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 ring-2 ring-emerald-400/40"
                          : "bg-gradient-to-t from-emerald-600/80 to-emerald-400 group-hover:from-emerald-500 group-hover:to-teal-300"
                      }`}
                    />

                    <span className="text-[10px] font-mono text-slate-500 truncate w-full text-center">
                      {t.date.split("-").slice(1).join("/")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Comparative Multilayer Bar View (Gross vs Net vs Settle) */
          <div className="space-y-3">
            <div className="flex items-center justify-end gap-4 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Gross Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Net Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-purple-500" /> Total Paid
              </span>
            </div>

            <div className="grid grid-flow-col auto-cols-fr gap-3 items-end h-44 pt-4 px-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800/80">
              {data.map((t, idx) => {
                const gross = parseFloat(t.gross_sales) || 0;
                const net = parseFloat(t.net_sales) || 0;
                const paid = parseFloat(t.total_paid) || 0;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                    <div className="flex items-end gap-1 h-full w-full justify-center">
                      {/* Gross */}
                      <div
                        style={{ height: `${Math.max((gross / maxValue) * 100, 4)}%` }}
                        className="w-2.5 bg-blue-500/80 group-hover:bg-blue-500 rounded-t-sm transition-all"
                        title={`Gross: ₹${t.gross_sales}`}
                      />
                      {/* Net */}
                      <div
                        style={{ height: `${Math.max((net / maxValue) * 100, 4)}%` }}
                        className="w-2.5 bg-emerald-500 rounded-t-sm transition-all shadow-sm"
                        title={`Net: ₹${t.net_sales}`}
                      />
                      {/* Paid */}
                      <div
                        style={{ height: `${Math.max((paid / maxValue) * 100, 4)}%` }}
                        className="w-2.5 bg-purple-500/80 group-hover:bg-purple-500 rounded-t-sm transition-all"
                        title={`Paid: ₹${t.total_paid}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 truncate text-center">
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
