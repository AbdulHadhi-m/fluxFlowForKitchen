import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { useApprovals, useRespondApproval } from "../hooks/useAutomation";
import { StatusBadge } from "../components/StatusBadge";

export const ApprovalInboxPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = React.useState("PENDING");
  const { data: approvals, isLoading } = useApprovals({ status: statusFilter });
  const respond = useRespondApproval();

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/automation"
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Inbox className="h-5 w-5 text-violet-400" />
            <span>Approval Inbox</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Human approval gates raised by automated workflows</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["PENDING", "APPROVED", "REJECTED", "EXPIRED", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors border ${
              statusFilter === s
                ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (approvals || []).length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No {statusFilter.toLowerCase()} approval requests.
        </div>
      ) : (
        <div className="space-y-3">
          {(approvals || []).map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-violet-500/40 transition-all"
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{a.workflow_name}</span>
                    <StatusBadge kind="approval" status={a.status} />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {a.workflow_code} · step {a.step_code}
                    {a.approver_role ? ` · requires ${a.approver_role}` : ""}
                  </div>
                  {a.reason && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">{a.reason}</p>}
                  {Number(a.amount) > 0 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Amount: <span className="text-amber-600 dark:text-amber-300 font-bold">${a.amount}</span>
                    </p>
                  )}
                  {a.related_data && Object.keys(a.related_data).length > 0 && (
                    <pre className="mt-2 p-2 rounded-lg bg-slate-200 dark:bg-slate-800/60 text-[10px] text-slate-500 font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(a.related_data, null, 2)}
                    </pre>
                  )}
                  <div className="text-[10px] text-slate-600 mt-2">
                    Requested by {a.requested_by_name || "system"} ·{" "}
                    {a.expires_at ? `expires ${new Date(a.expires_at).toLocaleString()}` : "no expiry"}
                    {a.escalation_count > 0 && <span className="text-amber-400"> · escalated {a.escalation_count}x</span>}
                  </div>
                  {a.status !== "PENDING" && a.response_note && (
                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      Response: <span className="text-slate-600 dark:text-slate-300">{a.response_note}</span>
                    </div>
                  )}
                </div>

                {a.status === "PENDING" && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => respond.mutate({ id: a.id, decision: "approve" })}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const note = window.prompt("Reason for rejection (optional):", "") || "";
                        respond.mutate({ id: a.id, decision: "reject", note });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                    <Link
                      to={`/automation/executions/${a.execution}`}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition-colors text-center"
                    >
                      View Run
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};