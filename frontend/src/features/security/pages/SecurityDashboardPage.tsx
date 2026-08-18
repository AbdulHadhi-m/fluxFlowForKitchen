import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  ShieldAlert,
  Key,
  Users,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  Settings,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { securityApi } from "../api/security.api";
import { SecurityDashboardMetrics } from "../types/security.types";

export const SecurityDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const res = await securityApi.getDashboardMetrics();
      if (res.success) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.error("Failed to load security metrics", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Security & Compliance Dashboard</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time platform posture, authentication analytics, MFA adoption, access controls, and security incidents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/security/settings">
            <Button variant="outline" size="sm" className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Policy Settings
            </Button>
          </Link>
          <Link to="/security/mfa">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 font-bold">
              <Key className="h-3.5 w-3.5" />
              MFA Configuration
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Failed Logins (24h)</span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {loading ? "..." : metrics?.failed_logins_24h ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Successful: {metrics?.successful_logins_24h ?? 0}</span>
          </div>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">MFA Adoption</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Key className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {loading ? "..." : `${metrics?.mfa_adoption_percent ?? 0}%`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics?.mfa_enabled_count ?? 0} of {metrics?.total_staff ?? 0} staff accounts
          </div>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Sessions</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {loading ? "..." : metrics?.active_sessions ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across all authenticated devices
          </div>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Open Incidents</span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {loading ? "..." : metrics?.open_incidents ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Requiring review or investigation
          </div>
        </Card>
      </div>

      {/* Suspicious Alerts Section */}
      {metrics?.suspicious_alerts && metrics.suspicious_alerts.length > 0 && (
        <Card className="bg-rose-950/20 border-rose-800/40 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h3 className="text-sm font-bold text-rose-300">Active Suspicious Activity Detected</h3>
          </div>
          <div className="space-y-2">
            {metrics.suspicious_alerts.map((alert, idx) => (
              <div key={idx} className="bg-slate-950/60 border border-rose-900/30 p-2.5 rounded-lg text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-rose-300">{alert.rule}</span>
                  <span className="text-slate-400 ml-2">
                    {alert.email && `User: ${alert.email} `}
                    {alert.ip_address && `IP: ${alert.ip_address} `}
                    ({alert.count} events in {alert.window_minutes}m)
                  </span>
                </div>
                <Link to="/security/events">
                  <Button size="sm" variant="ghost" className="h-6 text-[11px] text-rose-300 hover:text-white">
                    Investigate
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link to="/security/events" className="group">
          <Card className="bg-slate-900/60 border-slate-800 p-4 hover:border-slate-700 transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Activity className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-white">Security Event Log</h3>
            <p className="text-xs text-slate-400 mt-1">
              Search and filter immutable audit trails of logins, MFA changes, and permission denials.
            </p>
          </Card>
        </Link>

        <Link to="/security/incidents" className="group">
          <Card className="bg-slate-900/60 border-slate-800 p-4 hover:border-slate-700 transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-white">Incident Management</h3>
            <p className="text-xs text-slate-400 mt-1">
              Track, triage, investigate, and resolve security incidents with full audit notes.
            </p>
          </Card>
        </Link>

        <Link to="/security/access-review" className="group">
          <Card className="bg-slate-900/60 border-slate-800 p-4 hover:border-slate-700 transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UserCheck className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-white">Access & Session Review</h3>
            <p className="text-xs text-slate-400 mt-1">
              Review staff roles, MFA status, active sessions, and force logout compromised accounts.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
};
