import React from "react";
import { Cable, Globe, Webhook, Wifi } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useIntegrations } from "../hooks/useMonitoring";
import { MetricCard } from "../components/MetricCard";
import { HealthBadge } from "../components/MonitoringBadges";

export const IntegrationsPage: React.FC = () => {
  const { data, isLoading } = useIntegrations();
  const integrations = data?.data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Cable className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Integrations</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          External service calls, webhook deliveries, and WebSocket connectivity (auto-refreshes every 30s).
        </p>
      </div>

      {isLoading && <div className="text-xs text-slate-500">Loading integration data…</div>}

      {integrations && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Webhook Success Rate"
              value={`${integrations.webhooks.success_rate.toFixed(1)}%`}
              sub={`Total deliveries: ${integrations.webhooks.total}`}
              tone={integrations.webhooks.success_rate < 90 ? "bad" : "good"}
              icon={<Webhook className="h-3.5 w-3.5" />}
            />
            <MetricCard
              label="WebSocket Connections"
              value={integrations.websockets.total_connections}
              sub={`Status: ${integrations.websockets.status}`}
              icon={<Wifi className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-3.5 w-3.5 text-violet-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">External Services</h3>
              </div>
              {integrations.external.length === 0 ? (
                <div className="text-xs text-slate-500">No external calls recorded in the window.</div>
              ) : (
                <div className="space-y-2">
                  {integrations.external.map((row) => (
                    <div key={row.service} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-300">{row.service}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500">{row.total} calls</span>
                        <span
                          className={`text-[11px] font-bold ${row.failure_rate > 10 ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300"}`}
                        >
                          {row.failure_rate.toFixed(1)}% failed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="h-3.5 w-3.5 text-violet-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active WebSocket Streams</h3>
              </div>
              {Object.keys(integrations.websockets.active_by_type).length === 0 ? (
                <div className="text-xs text-slate-500">No active streams (Redis unavailable or idle).</div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(integrations.websockets.active_by_type).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-300 capitalize">{type}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300">Stream status</span>
                  <HealthBadge status={integrations.websockets.status === "healthy" ? "HEALTHY" : "DEGRADED"} />
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};