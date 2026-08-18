import React, { useState } from "react";
import { Siren, MessageSquareText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIncidents, useSLOs } from "../hooks/useMonitoring";
import { MetricCard } from "../components/MetricCard";
import { SeverityBadge, StatusBadge } from "../components/MonitoringBadges";

export const IncidentsPage: React.FC = () => {
  const { data, isLoading, acknowledge, resolve, addNote } = useIncidents();
  const slos = useSLOs();
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});

  const incidents = data?.data.incidents || [];
  const metrics = data?.data.metrics;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Siren className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">Incidents</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Operational incident lifecycle with MTTA/MTTR tracking and timeline notes (auto-refreshes every 30s).
        </p>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Incidents (30d)" value={metrics.incident_count} />
          <MetricCard
            label="Open Now"
            value={metrics.open_count}
            tone={metrics.open_count > 0 ? "warn" : "good"}
          />
          <MetricCard label="MTTA" value={metrics.mtta_minutes != null ? `${metrics.mtta_minutes}m` : "—"} />
          <MetricCard label="MTTR" value={metrics.mttr_minutes != null ? `${metrics.mttr_minutes}m` : "—"} />
        </div>
      )}

      {isLoading && <div className="text-xs text-slate-500">Loading incidents…</div>}

      <div className="space-y-3">
        {incidents.map((incident) => (
          <Card key={incident.id} className="bg-slate-900/60 border-slate-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{incident.title}</span>
                  <SeverityBadge severity={incident.severity} />
                  <StatusBadge status={incident.status} />
                </div>
                <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-3 flex-wrap">
                  <span>{incident.affected_service}</span>
                  <span>detected: {new Date(incident.detected_at).toLocaleString()}</span>
                  {incident.mtta_minutes != null && <span>MTTA: {incident.mtta_minutes}m</span>}
                  {incident.mttr_minutes != null && <span>MTTR: {incident.mttr_minutes}m</span>}
                </div>
              </div>

              {incident.status === "OPEN" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs shrink-0"
                  onClick={() => acknowledge.mutate(incident.id)}
                >
                  Acknowledge
                </Button>
              )}

              {(incident.status === "OPEN" || incident.status === "INVESTIGATING") && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <input
                    placeholder="Note…"
                    value={noteInput[incident.id] || ""}
                    onChange={(e) => setNoteInput((prev) => ({ ...prev, [incident.id]: e.target.value }))}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-40"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs gap-1"
                    onClick={() => {
                      if (noteInput[incident.id]) {
                        addNote.mutate({ id: incident.id, text: noteInput[incident.id] });
                        setNoteInput((prev) => ({ ...prev, [incident.id]: "" }));
                      }
                    }}
                  >
                    <MessageSquareText className="h-3 w-3" /> Note
                  </Button>
                  <input
                    placeholder="Resolution notes…"
                    value={noteText[incident.id] || ""}
                    onChange={(e) => setNoteText((prev) => ({ ...prev, [incident.id]: e.target.value }))}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-40"
                  />
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                    onClick={() => resolve.mutate({ id: incident.id, notes: noteText[incident.id] || "" })}
                  >
                    Resolve
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
        {!isLoading && incidents.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-8">No incidents recorded.</div>
        )}
      </div>

      {slos.data?.data?.length ? (
        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <h3 className="text-sm font-bold text-white mb-3">Service-Level Objectives (internal targets)</h3>
          <div className="space-y-2">
            {slos.data.data.map((slo) => (
              <div key={slo.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-xs text-slate-200 font-medium">
                    {slo.name} <span className="text-[10px] text-slate-500">({slo.service})</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Target {slo.target}%{slo.is_contractual ? "" : " · internal"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {slo.latest_sli != null ? (
                    <>
                      <span className="text-[11px] text-slate-300">SLI: {slo.latest_sli}%</span>
                      <span
                        className={`text-[11px] font-bold ${slo.latest_error_budget_remaining != null && slo.latest_error_budget_remaining <= 0 ? "text-rose-300" : "text-emerald-300"}`}
                      >
                        Budget: {slo.latest_error_budget_remaining != null ? `${slo.latest_error_budget_remaining}%` : "—"}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-500">Not yet evaluated</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
};