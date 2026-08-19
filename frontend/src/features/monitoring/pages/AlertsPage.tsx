import React, { useState } from "react";
import { ShieldAlert, BellRing } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAlerts } from "../hooks/useMonitoring";
import { SeverityBadge, StatusBadge } from "../components/MonitoringBadges";

export const AlertsPage: React.FC = () => {
  const { data, isLoading, acknowledge, resolve } = useAlerts();
  const [note, setNote] = useState<Record<string, string>>({});

  const alerts = data?.data || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BellRing className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Alerts</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Active, acknowledged, and resolved alert conditions (auto-refreshes every 30s).
        </p>
      </div>

      {isLoading && <div className="text-xs text-slate-500">Loading alerts…</div>}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{alert.title}</span>
                  <SeverityBadge severity={alert.severity} />
                  <StatusBadge status={alert.status} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{alert.message}</p>
                <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-3 flex-wrap">
                  <span>triggered x{alert.trigger_count}</span>
                  <span>last: {new Date(alert.last_triggered_at).toLocaleString()}</span>
                  {alert.metric_value != null && <span>value: {alert.metric_value}</span>}
                  {alert.incident && <span>linked incident</span>}
                </div>
                {alert.resolution_note && (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-300 mt-1.5">Resolution: {alert.resolution_note}</div>
                )}
              </div>

              {alert.status === "ACTIVE" && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs"
                    onClick={() => acknowledge.mutate(alert.id)}
                  >
                    Acknowledge
                  </Button>
                  <div className="flex items-center gap-2">
                    <input
                      placeholder="Resolution note…"
                      value={note[alert.id] || ""}
                      onChange={(e) => setNote((prev) => ({ ...prev, [alert.id]: e.target.value }))}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-44"
                    />
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                      onClick={() => resolve.mutate({ id: alert.id, note: note[alert.id] || "" })}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
        {!isLoading && alerts.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-8 flex flex-col items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-emerald-400" />
            No alerts. All monitored conditions are within bounds.
          </div>
        )}
      </div>
    </div>
  );
};