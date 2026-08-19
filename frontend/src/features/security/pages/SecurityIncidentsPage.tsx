import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Plus,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { securityApi } from "../api/security.api";
import { SecurityIncidentItem } from "../types/security.types";

export const SecurityIncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<SecurityIncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncidentItem | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState("MEDIUM");
  const [noteText, setNoteText] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, severityFilter]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const res = await securityApi.getIncidents({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });
      if (res.success) {
        setIncidents(res.data);
      }
    } catch (err) {
      console.error("Failed to load security incidents", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await securityApi.createIncident({
        title: newTitle,
        description: newDesc,
        severity: newSeverity,
      });
      if (res.success) {
        setShowCreateModal(false);
        setNewTitle("");
        setNewDesc("");
        loadIncidents();
      }
    } catch (err) {
      console.error("Failed to create incident", err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedIncident) return;
    try {
      const res = await securityApi.updateIncident(selectedIncident.id, {
        status: newStatus || undefined,
        note: noteText || undefined,
      });
      if (res.success) {
        setSelectedIncident(res.data);
        setNoteText("");
        loadIncidents();
      }
    } catch (err) {
      console.error("Failed to update incident", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">OPEN</span>;
      case "INVESTIGATING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">INVESTIGATING</span>;
      case "CONTAINED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">CONTAINED</span>;
      case "RESOLVED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600/30">CLOSED</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Security Incidents</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track, triage, investigate, and remediate security events, policy breaches, and account compromise alerts.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          size="sm"
          className="bg-amber-600 hover:bg-amber-500 text-white text-xs gap-1.5 font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          Report Incident
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/60">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-amber-500 h-9"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="CONTAINED">Contained</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-amber-500 h-9"
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Incident List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-400" />
            Loading security incidents...
          </Card>
        ) : incidents.length === 0 ? (
          <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500">
            No security incidents recorded.
          </Card>
        ) : (
          incidents.map((inc) => (
            <Card
              key={inc.id}
              onClick={() => {
                setSelectedIncident(inc);
                setNewStatus(inc.status);
              }}
              className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {getStatusBadge(inc.status)}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{inc.title}</h3>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {new Date(inc.created_at).toLocaleString()}
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{inc.description || "No description provided."}</p>
              <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-500">
                <span>Reporter: {inc.reported_by_email || "System"}</span>
                {inc.assigned_to_email && <span>Assignee: {inc.assigned_to_email}</span>}
                {inc.notes?.length > 0 && <span>{inc.notes.length} investigation notes</span>}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Incident Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Report Security Incident
            </h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-300 font-medium block mb-1">Title</label>
                <Input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Repeated failed logins on manager account"
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-slate-300 font-medium block mb-1">Severity</label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-600 dark:text-slate-300"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 dark:text-slate-300 font-medium block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe the incident, affected accounts, and initial observations..."
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-600 dark:text-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold">
                  Submit Report
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Incident Detail & Investigation Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 w-full max-w-xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedIncident.status)}
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{selectedIncident.title}</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIncident(null)} className="h-6 w-6 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                ✕
              </Button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              {selectedIncident.description || "No description."}
            </p>

            {/* Investigation Notes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Investigation Notes & Timeline
              </h3>
              {selectedIncident.notes?.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No investigation notes recorded yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedIncident.notes.map((n, i) => (
                    <div key={i} className="bg-slate-100/80 dark:bg-slate-950/80 p-2 rounded border border-slate-200 dark:border-slate-800/60 text-[11px]">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                        <span className="font-bold text-slate-600 dark:text-slate-300">{n.author}</span>
                        <span className="font-mono text-[10px]">{new Date(n.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-200">{n.text}</div>
                      {n.status_change && <div className="text-amber-400 text-[10px] mt-0.5 font-mono">{n.status_change}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Note & Update Status */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Update Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-1.5 text-xs text-slate-600 dark:text-slate-300"
                  >
                    <option value="OPEN">Open</option>
                    <option value="INVESTIGATING">Investigating</option>
                    <option value="CONTAINED">Contained</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Add Note</label>
                <textarea
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record investigation findings, actions taken, or resolution summary..."
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-xs text-slate-600 dark:text-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setSelectedIncident(null)} className="text-xs">
                  Close
                </Button>
                <Button size="sm" onClick={handleUpdate} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold">
                  Save Update
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
