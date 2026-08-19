import React, { useEffect, useState } from "react";
import {
  Shield,
  Search,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { securityApi } from "../api/security.api";
import { SecurityEventItem } from "../types/security.types";

export const SecurityEventsPage: React.FC = () => {
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<SecurityEventItem | null>(null);

  useEffect(() => {
    loadEvents();
  }, [severityFilter, typeFilter]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await securityApi.getSecurityEvents({
        search: search || undefined,
        severity: severityFilter || undefined,
        event_type: typeFilter || undefined,
      });
      if (res.success) {
        setEvents(res.data);
      }
    } catch (err) {
      console.error("Failed to load security events", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEvents();
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border border-yellow-500/30">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600/30">LOW</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Security Event Log</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immutable, append-only security event audit trail covering authentication, authorization, MFA, and access anomalies.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/60">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, email, IP, correlation ID..."
            className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 h-9"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500 h-9"
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500 h-9"
        >
          <option value="">All Event Types</option>
          <option value="AUTH_LOGIN_SUCCESS">Login Success</option>
          <option value="AUTH_LOGIN_FAILED">Login Failed</option>
          <option value="ACCOUNT_LOCKED">Account Locked</option>
          <option value="MFA_ENABLED">MFA Enabled</option>
          <option value="MFA_DISABLED">MFA Disabled</option>
          <option value="PERMISSION_DENIED">Permission Denied</option>
          <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
          <option value="SECURITY_SETTING_CHANGED">Setting Changed</option>
        </select>
      </form>

      {/* Events Table */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Event Type</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading security events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No security events found matching criteria.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(evt.created_at).toLocaleString()}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {getSeverityBadge(evt.severity)}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-indigo-600 dark:text-indigo-300 font-bold">
                      {evt.event_type}
                    </td>
                    <td className="p-3.5 text-slate-900 dark:text-white font-medium">
                      {evt.user_email || "—"}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {evt.ip_address || "—"}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {evt.description}
                    </td>
                    <td className="p-3.5 text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-400 hover:text-slate-900 dark:hover:text-white p-1">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Security Event Detail</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedEvent(null)} className="h-6 w-6 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                ✕
              </Button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Event Type:</span>
                <span className="col-span-2 font-mono text-indigo-600 dark:text-indigo-300 font-bold">{selectedEvent.event_type}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Severity:</span>
                <span className="col-span-2">{getSeverityBadge(selectedEvent.severity)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Timestamp:</span>
                <span className="col-span-2 text-slate-700 dark:text-slate-200">{new Date(selectedEvent.created_at).toUTCString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 dark:text-slate-400">User:</span>
                <span className="col-span-2 text-slate-900 dark:text-white font-medium">{selectedEvent.user_email || "System / Unauthenticated"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 dark:text-slate-400">IP Address:</span>
                <span className="col-span-2 font-mono text-slate-600 dark:text-slate-300">{selectedEvent.ip_address || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Correlation ID:</span>
                <span className="col-span-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">{selectedEvent.correlation_id || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 dark:text-slate-400">Description:</span>
                <span className="col-span-2 text-slate-700 dark:text-slate-200">{selectedEvent.description}</span>
              </div>
              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Metadata:</span>
                  <pre className="bg-white dark:bg-slate-950 p-2 rounded text-[11px] font-mono text-slate-600 dark:text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setSelectedEvent(null)} className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
