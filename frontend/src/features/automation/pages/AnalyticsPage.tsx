import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";
import { useAutomationAnalytics } from "../hooks/useAutomation";
import { AutomationMetricsCards } from "../components/AutomationMetricsCards";

export const AnalyticsPage: React.FC = () => {
  const [days, setDays] = React.useState(30);
  const { data: analytics, isLoading } = useAutomationAnalytics(days);

  const maxDaily = Math.max(1, ...(analytics?.daily || []).map((d) => d.total));
  const maxFailures = Math.max(1, ...(analytics?.action_failures || []).map((f) => f.failures));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/automation"
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-400" />
            <span>Automation Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Execution KPIs, failure hotspots, and adoption over time</p>
        </div>
        <select
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <AutomationMetricsCards analytics={analytics} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Executions Per Day</h3>
          {(analytics?.daily || []).length === 0 ? (
            <div className="py-8 text-center text-[11px] text-slate-600">No execution data in this window.</div>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {(analytics?.daily || []).map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.day}: ${d.total} runs`}>
                  <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-600/60 to-emerald-400/80 transition-all group-hover:from-emerald-500/80"
                    style={{ height: `${Math.max(4, (d.total / maxDaily) * 100)}%` }}
                  />
                  <span className="text-[8px] text-slate-600">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Most Used Workflows</h3>
          {(analytics?.most_used_workflows || []).length === 0 ? (
            <div className="py-8 text-center text-[11px] text-slate-600">No workflow runs yet.</div>
          ) : (
            <div className="space-y-3">
              {(analytics?.most_used_workflows || []).map((w) => (
                <div key={w.code}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">{w.name}</span>
                    <span className="text-slate-500 font-mono">{w.executions} runs</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                      style={{ width: `${Math.min(100, (w.executions / (analytics?.most_used_workflows?.[0]?.executions || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Action Failures</h3>
          {(analytics?.action_failures || []).length === 0 ? (
            <div className="py-8 text-center text-[11px] text-slate-600">No step failures in this window. </div>
          ) : (
            <div className="space-y-3">
              {(analytics?.action_failures || []).map((f) => (
                <div key={f.step_code}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600 dark:text-slate-300 font-mono">{f.step_code}</span>
                    <span className="text-rose-400 font-bold">{f.failures} failures</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400"
                      style={{ width: `${Math.min(100, (f.failures / maxFailures) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Status Breakdown</h3>
          {[
            { label: "Successful", value: analytics?.successful ?? 0, cls: "bg-emerald-400" },
            { label: "Failed", value: analytics?.failed ?? 0, cls: "bg-rose-400" },
            { label: "Waiting / Approval", value: analytics?.waiting ?? 0, cls: "bg-amber-400" },
            { label: "Cancelled", value: analytics?.cancelled ?? 0, cls: "bg-slate-500" },
          ].map((row) => {
            const total = Math.max(1, analytics?.executions_total ?? 1);
            const pct = Math.round(((row.value ?? 0) / total) * 100);
            return (
              <div key={row.label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
                  <span className="text-slate-600 dark:text-slate-300 font-bold">
                    {row.value} ({pct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${row.cls}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-600">
            Success rate {analytics?.success_rate ?? 0}% · Failure rate {analytics?.failure_rate ?? 0}% · Avg duration{" "}
            {analytics?.avg_duration_seconds != null ? `${analytics.avg_duration_seconds}s` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
};