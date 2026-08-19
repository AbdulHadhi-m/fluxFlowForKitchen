import React from "react";
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
}

const TONES = {
  default: "text-slate-900 dark:text-white",
  good: "text-emerald-600 dark:text-emerald-300",
  warn: "text-amber-600 dark:text-amber-300",
  bad: "text-rose-600 dark:text-rose-300",
};

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, sub, icon, tone = "default" }) => (
  <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-4">
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
      {icon && (
        <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          {icon}
        </div>
      )}
    </div>
    <div className={`text-2xl font-black mt-2 ${TONES[tone]}`}>{value}</div>
    {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
  </Card>
);