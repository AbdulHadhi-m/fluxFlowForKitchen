import React from "react";
import { HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useHealth } from "../hooks/useMonitoring";
import { HealthBadge } from "../components/MonitoringBadges";

export const HealthPage: React.FC = () => {
  const { data, isLoading, refetch, isFetching } = useHealth();
  const health = data?.data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <HeartPulse className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">System Health</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Dependency status and readiness probe details (checked on page load; refresh to re-probe).
        </p>
      </div>

      {isLoading && <div className="text-xs text-slate-500">Probing dependencies…</div>}

      {health && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <HealthBadge status={health.status} />
            <span className="text-[11px] text-slate-500">
              checks at {new Date(health.checked_at).toLocaleString()}
            </span>
            <button
              onClick={() => refetch()}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
            >
              {isFetching ? "Checking…" : "Re-check"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(health.dependencies).map(([name, dep]) => (
              <Card key={name} className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">{name.replace("_", " ")}</h3>
                  <HealthBadge status={dep.status} />
                </div>
                <dl className="space-y-1.5">
                  {dep.details && (
                    <div className="flex justify-between">
                      <dt className="text-[11px] text-slate-500">Details</dt>
                      <dd className="text-[11px] text-slate-600 dark:text-slate-300">{dep.details}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-[11px] text-slate-500">Latency</dt>
                    <dd className="text-[11px] text-slate-600 dark:text-slate-300">{dep.latency_ms}ms</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[11px] text-slate-500">Critical</dt>
                    <dd className="text-[11px] text-slate-600 dark:text-slate-300">{dep.critical ? "Yes" : "No"}</dd>
                  </div>
                  {dep.error && (
                    <div className="mt-2 rounded-lg bg-rose-500/5 border border-rose-500/20 p-2">
                      <span className="text-[11px] text-rose-600 dark:text-rose-300 break-all">{dep.error}</span>
                    </div>
                  )}
                </dl>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};