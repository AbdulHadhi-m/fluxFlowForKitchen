import React, { useState } from "react";
import { PaymentBreakdownItem } from "../types/reports.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreditCard, Banknote, QrCode, Building, BadgeIndianRupee, PieChart } from "lucide-react";

interface PaymentBreakdownCardProps {
  payments: PaymentBreakdownItem[];
}

const COLOR_PALETTE = [
  { stroke: "#8b5cf6", fill: "bg-purple-500", text: "text-purple-400" }, // Purple (Card/UPI)
  { stroke: "#10b981", fill: "bg-emerald-500", text: "text-emerald-400" }, // Emerald (Cash)
  { stroke: "#3b82f6", fill: "bg-blue-500", text: "text-blue-400" }, // Blue
  { stroke: "#f59e0b", fill: "bg-amber-500", text: "text-amber-400" }, // Amber
  { stroke: "#ec4899", fill: "bg-pink-500", text: "text-pink-400" }, // Pink
];

export const PaymentBreakdownCard: React.FC<PaymentBreakdownCardProps> = ({ payments }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = payments.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

  const getMethodIcon = (method: string) => {
    switch (method?.toUpperCase()) {
      case "CASH":
        return <Banknote className="h-4 w-4 text-emerald-400" />;
      case "CARD":
        return <CreditCard className="h-4 w-4 text-purple-400" />;
      case "UPI":
        return <QrCode className="h-4 w-4 text-blue-400" />;
      case "BANK_TRANSFER":
        return <Building className="h-4 w-4 text-amber-400" />;
      default:
        return <BadgeIndianRupee className="h-4 w-4 text-slate-400" />;
    }
  };

  // SVG Donut Calculations
  const size = 160;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;
  const slices = payments.map((p, idx) => {
    const amount = parseFloat(p.total_amount) || 0;
    const pct = total > 0 ? amount / total : 0;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle * circumference;
    cumulativeAngle += pct;
    const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];

    return {
      ...p,
      amount,
      pct: pct * 100,
      strokeDasharray,
      strokeDashoffset,
      color,
    };
  });

  return (
    <Card className="bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 dark:text-purple-400">
              <PieChart className="h-4 w-4" />
            </div>
            Payment Tenders
          </CardTitle>
          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-200">
            Total: ₹{total.toFixed(2)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {payments.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
            No payment settlements recorded in this period.
          </div>
        ) : (
          <>
            {/* Interactive SVG Donut Chart */}
            <div className="relative flex items-center justify-center py-2">
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg] overflow-visible">
                {/* Background Ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-slate-100 dark:text-slate-950"
                />

                {/* Slices */}
                {slices.map((slice, idx) => {
                  const isHovered = hoveredIndex === idx;
                  return (
                    <circle
                      key={idx}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="transparent"
                      stroke={slice.color.stroke}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      strokeLinecap="round"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered ? "drop-shadow(0 0 6px rgba(139, 92, 246, 0.5))" : "none",
                      }}
                    />
                  );
                })}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                {hoveredIndex !== null && slices[hoveredIndex] ? (
                  <>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold truncate max-w-[90px]">
                      {slices[hoveredIndex].payment_method}
                    </span>
                    <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                      {slices[hoveredIndex].pct.toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      ₹{slices[hoveredIndex].amount.toFixed(0)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      Settled
                    </span>
                    <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                      ₹{total.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {payments.reduce((s, p) => s + p.count, 0)} txns
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* List Breakdown */}
            <div className="space-y-2.5 pt-1">
              {slices.map((p, idx) => {
                const isHovered = hoveredIndex === idx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`p-2 rounded-xl transition-all border ${
                      isHovered
                        ? "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 shadow-sm"
                        : "bg-slate-50/70 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800/60"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${p.color.fill}`} />
                        {getMethodIcon(p.payment_method)}
                        <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">
                          {p.payment_method.replace("_", " ")}
                        </span>
                        <span className="text-slate-400 text-[10px]">({p.count} txns)</span>
                      </div>
                      <div className="font-mono text-right">
                        <span className="text-slate-900 dark:text-white font-bold">₹{p.total_amount}</span>
                        <span className="text-emerald-500 dark:text-emerald-400 font-semibold text-[10px] ml-1.5">
                          ({p.pct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Visual bar */}
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${p.pct}%`,
                          backgroundColor: p.color.stroke,
                        }}
                        className="h-full rounded-full transition-all duration-500"
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
