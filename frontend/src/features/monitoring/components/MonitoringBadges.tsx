import React from "react";
import { ErrorSeverity, AlertStatus, IncidentStatus } from "../types/monitoring.types";

const SEVERITY_STYLES: Record<ErrorSeverity, string> = {
  LOW: "bg-slate-500/10 border-slate-500/30 text-slate-300",
  MEDIUM: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  HIGH: "bg-orange-500/10 border-orange-500/30 text-orange-300",
  CRITICAL: "bg-rose-500/10 border-rose-500/30 text-rose-300",
};

export const SeverityBadge: React.FC<{ severity: ErrorSeverity }> = ({ severity }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.MEDIUM}`}>
    {severity}
  </span>
);

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-sky-500/10 border-sky-500/30 text-sky-300",
  ACTIVE: "bg-rose-500/10 border-rose-500/30 text-rose-300",
  ACKNOWLEDGED: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  INVESTIGATING: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300",
  RESOLVED: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  CLOSED: "bg-slate-500/10 border-slate-500/30 text-slate-300",
  IGNORED: "bg-slate-500/10 border-slate-500/30 text-slate-300",
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${STATUS_STYLES[status] || STATUS_STYLES.NEW}`}>
    {status}
  </span>
);

export const HealthBadge: React.FC<{ status: string }> = ({ status }) => {
  const color =
    status === "HEALTHY"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : status === "DEGRADED"
        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
        : "bg-rose-500/10 border-rose-500/30 text-rose-300";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${color}`}>
      {status}
    </span>
  );
};

export const DepStateBadge: React.FC<{ status: AlertStatus | IncidentStatus }> = ({ status }) => (
  <StatusBadge status={status} />
);