import React from "react";
import { RequisitionStatus, RequisitionPriority } from "../types/procurement.types";

interface RequisitionStatusBadgeProps {
  status: RequisitionStatus;
}

const statusConfig: Record<
  RequisitionStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  DRAFT: {
    label: "Draft",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
  SUBMITTED: {
    label: "Submitted",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  APPROVED: {
    label: "Approved",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
  CONVERTED_TO_PO: {
    label: "PO Generated",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
  },
};

export const RequisitionStatusBadge: React.FC<RequisitionStatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || {
    label: status,
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      {config.label}
    </span>
  );
};

export const RequisitionPriorityBadge: React.FC<{ priority: RequisitionPriority }> = ({ priority }) => {
  const config: Record<RequisitionPriority, { label: string; color: string }> = {
    LOW: { label: "Low", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
    NORMAL: { label: "Normal", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    URGENT: { label: "Urgent", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    EMERGENCY: { label: "Emergency", color: "text-rose-400 bg-rose-500/20 border-rose-500/40 animate-pulse" },
  };

  const c = config[priority] || config.NORMAL;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${c.color}`}>
      {c.label}
    </span>
  );
};
