import React from "react";
import { Link } from "react-router-dom";
import { Activity, Gauge, ShieldAlert, AlertTriangle, Timer, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOverview } from "../hooks/useMonitoring";
import { MetricCard } from "../components/MetricCard";
import { HealthBadge, SeverityBadge, StatusBadge } from "../components/MonitoringBadges";

const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

export const MonitoringOverviewPage: React.FC = () => {
  const { data, isLoading } = useOverview();
  const overview = data?.data;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Activity className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Monitoring Overview</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Platform health, API performance, error tracking, and reliability posture (auto-refreshes every 30s).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/monitoring/health">
            <Button variant="outline" size="sm" className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs gap-1.5">
              <Gauge className="h-3.5 w-3.5" /> System Health
            </Button>
          </Link>
          <Link to="/monitoring/alerts">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 font-bold">
              <ShieldAlert className="h-3.5 w-3.5" /> Active Alerts
            </Button>
          </Link>
        </div>
      </div>

      {isLoading && <div className="text-xs text-slate-500">Loading monitoring data…</div>}

      {overview && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <HealthBadge status={overview.status} />
            <span className="text-[11px] text-slate-500">
              v{overview.version.version} · {overview.version.environment} · scope: {overview.scope}
            </span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Timer className="h-3 w-3" /> Uptime {formatUptime(overview.uptime_seconds)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Requests (window)"
              value={overview.requests.total}
              sub={`Errors: ${overview.requests.errors} (${overview.requests.error_rate.toFixed(2)}%)`}
              tone={overview.requests.error_rate > 5 ? "bad" : "default"}
              icon={<Gauge className="h-3.5 w-3.5" />}
            />
            <MetricCard
              label="P95 Latency"
              value={overview.latency.p95 != null ? `${overview.latency.p95}ms` : "—"}
              sub={`P50: ${overview.latency.p50 != null ? `${overview.latency.p50}ms` : "—"} · P99: ${overview.latency.p99 != null ? `${overview.latency.p99}ms` : "—"}`}
              tone={overview.latency.p95 != null && overview.latency.p95 > 2000 ? "warn" : "good"}
            />
            <MetricCard
              label="Error Events"
              value={overview.errors.count}
              sub={`New: ${overview.errors.new ?? 0}`}
              tone={overview.errors.count > 0 ? "warn" : "good"}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
            />
            <MetricCard
              label="Active Alerts"
              value={overview.alerts.active}
              sub={`Acknowledged: ${overview.alerts.acknowledged} · Critical: ${overview.alerts.critical}`}
              tone={overview.alerts.critical > 0 ? "bad" : overview.alerts.active > 0 ? "warn" : "good"}
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-900/60 border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Dependencies</h3>
                <Link to="/monitoring/health" className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  Details <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              {overview.dependencies ? (
                <div className="space-y-2">
                  {Object.entries(overview.dependencies).map(([name, dep]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 capitalize">{name.replace("_", " ")}</span>
                      <div className="flex items-center gap-2">
                        {dep.critical && <span className="text-[10px] text-amber-400 font-bold">CRITICAL</span>}
                        <HealthBadge status={dep.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500">Restricted for your role.</div>
              )}
            </Card>

            <Card className="bg-slate-900/60 border-slate-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Open Incidents</h3>
                <Link to="/monitoring/incidents" className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              {overview.incidents.recent.length === 0 ? (
                <div className="text-xs text-slate-500">No open incidents.</div>
              ) : (
                <div className="space-y-2">
                  {overview.incidents.recent.map((incident) => (
                    <div key={incident.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-200 font-medium truncate">{incident.title}</div>
                        <div className="text-[10px] text-slate-500">{incident.affected_service}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={incident.severity} />
                        <StatusBadge status={incident.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};