import React from "react";
import {
  APPROVAL_STATUS_STYLES,
  EXECUTION_STATUS_STYLES,
  STEP_EXECUTION_STATUS_STYLES,
  WORKFLOW_STATUS_STYLES,
} from "../constants/automation.constants";
import {
  ApprovalStatus,
  ExecutionStatus,
  StepExecutionStatus,
  WorkflowStatus,
} from "../types/automation.types";

type StatusKind =
  | { kind: "workflow"; status: WorkflowStatus }
  | { kind: "execution"; status: ExecutionStatus }
  | { kind: "step"; status: StepExecutionStatus }
  | { kind: "approval"; status: ApprovalStatus };

export const StatusBadge: React.FC<StatusKind> = ({ kind, status }) => {
  const map = {
    workflow: WORKFLOW_STATUS_STYLES,
    execution: EXECUTION_STATUS_STYLES,
    step: STEP_EXECUTION_STATUS_STYLES,
    approval: APPROVAL_STATUS_STYLES,
  }[kind] as Record<string, string>;

  const fallback = "bg-slate-500/10 text-slate-400 border-slate-500/20";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase whitespace-nowrap ${
        map[status] || fallback
      }`}
    >
      {status}
    </span>
  );
};