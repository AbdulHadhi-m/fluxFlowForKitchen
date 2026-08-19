import React from "react";
import { Workflow, Play, CheckCircle2, XCircle, Clock, Gauge, Users, CalendarClock } from "lucide-react";
import { AutomationAnalyticsOverview } from "../types/automation.types";

interface Props {
  analytics?: AutomationAnalyticsOverview;
  isLoading?: boolean;
}

export const AutomationMetricsCards: React.FC<Props> = ({ analytics, isLoading }) => {
  const cards = [
    {
      label: "Active Workflows",
      value: analytics?.active_workflows ?? 0,
      sub: `${analytics?.paused_workflows ?? 0} paused`,
      icon: Workflow,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Executions (30d)",
      value: analytics?.executions_total ?? 0,
      sub: `${analytics?.executions_today ?? 0} today`,
      icon: Play,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      label: "Success Rate",
      value: `${analytics?.success_rate ?? 0}%`,
      sub: `${analytics?.successful ?? 0} successful runs`,
      icon: CheckCircle2,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      label: "Failures",
      value: analytics?.failed ?? 0,
      sub: `${analytics?.failed_today ?? 0} today`,
      icon: XCircle,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
    {
      label: "Avg Duration",
      value: analytics?.avg_duration_seconds != null ? `${analytics.avg_duration_seconds}s` : "—",
      sub: `${analytics?.retry_count ?? 0} retries`,
      icon: Gauge,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Pending Approvals",
      value: analytics?.pending_approvals ?? 0,
      sub: `${analytics?.escalations ?? 0} escalations`,
      icon: Users,
      color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    },
    {
      label: "Waiting Runs",
      value: analytics?.waiting ?? 0,
      sub: `${analytics?.cancelled ?? 0} cancelled`,
      icon: Clock,
      color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    },
    {
      label: "Scheduled Runs",
      value: analytics?.scheduled_runs ?? 0,
      sub: "Schedule-triggered",
      icon: CalendarClock,
      color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">{card.label}</span>
              <div className={`p-1.5 rounded-lg border shrink-0 ${card.color}`}>
                <Icon className="h-3 w-3" />
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
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