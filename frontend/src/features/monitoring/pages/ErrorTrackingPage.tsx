import React, { useState } from "react";
import { Bug, RefreshCw, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useErrors } from "../hooks/useMonitoring";
import { SeverityBadge, StatusBadge } from "../components/MonitoringBadges";
import { ErrorStatus } from "../types/monitoring.types";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All Status" },
  { value: "NEW", label: "New" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "INVESTIGATING", label: "Investigating" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "IGNORED", label: "Ignored" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "All Severity" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export const ErrorTrackingPage: React.FC = () => {
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [preset, setPreset] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, updateStatus } = useErrors({
    status: status || undefined,
    severity: severity || undefined,
    search: search || undefined,
    preset: preset || undefined,
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Bug className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Error Tracking</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Fingerprint-grouped application errors from the API, background jobs, and the frontend.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search message or error type…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Time</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearch("");
            setStatus("");
            setSeverity("");
            setPreset("");
          }}
          className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs gap-1.5"
        >
          <RefreshCw className="h-3 w-3" /> Reset
        </Button>
      </div>

      {isLoading && <div className="text-xs text-slate-500">Loading errors…</div>}

      <div className="space-y-3">
        {(data?.data || []).map((event) => (
          <Card key={event.id} className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{event.error_type || "Unknown"}</span>
                  <SeverityBadge severity={event.severity} />
                  <StatusBadge status={event.status} />
                  <span className="text-[10px] text-slate-500">{event.module}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 break-words line-clamp-2">{event.message}</p>
                <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-3 flex-wrap">
                  <span>x{event.count} occurrences</span>
                  <span>{event.endpoint || "no endpoint"}</span>
                  <span>env: {event.environment}</span>
                  {event.correlation_id && <span>corr: {event.correlation_id.slice(0, 12)}</span>}
                  <span>last: {new Date(event.last_seen).toLocaleString()}</span>
                </div>
              </div>
              <select
                value={event.status}
                onChange={(e) => updateStatus.mutate({ id: event.id, status: e.target.value as ErrorStatus })}
                className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                {STATUS_OPTIONS.filter((opt) => opt.value !== "").map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </Card>
        ))}
        {!isLoading && (data?.data || []).length === 0 && (
          <div className="text-xs text-slate-500 text-center py-8">No error events match the current filters.</div>
        )}
      </div>
    </div>
  );
};