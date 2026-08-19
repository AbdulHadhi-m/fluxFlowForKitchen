import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface SalesKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export const SalesKPICard: React.FC<SalesKPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-emerald-400",
  iconBg = "bg-emerald-500/10",
}) => {
  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
};
