import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, GitBranch, Search } from "lucide-react";
import { useExecutions, useWorkflows } from "../hooks/useAutomation";
import { StatusBadge } from "../components/StatusBadge";

export const ExecutionListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const workflowId = searchParams.get("workflow_id") || "";

  const { data: executions, isLoading } = useExecutions({
    search: search || undefined,
    status: statusFilter || undefined,
    workflow_id: workflowId || undefined,
  });
  const { data: workflows } = useWorkflows();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/automation"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-indigo-400" />
            <span>Executions</span>
          </h1>
          <p className="text-xs text-slate-400">Runtime traces of every workflow run — retry, pause, resume or cancel</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            placeholder="Search by workflow name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="RUNNING">Running</option>
          <option value="WAITING">Waiting</option>
          <option value="APPROVAL_REQUIRED">Approval Required</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="PAUSED">Paused</option>
        </select>
        {workflowId && (
          <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5">
            Filtered: {(workflows || []).find((w) => w.id === workflowId)?.name || workflowId}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (executions || []).length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500">
          No executions found.
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-slate-800/80">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Trigger</th>
                <th className="px-4 py-3 hidden lg:table-cell">Started</th>
                <th className="px-4 py-3 hidden lg:table-cell">Duration</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {(executions || []).map((ex) => {
                const duration =
                  ex.started_at && ex.completed_at
                    ? `${Math.max(0, (new Date(ex.completed_at).getTime() - new Date(ex.started_at).getTime()) / 1000).toFixed(1)}s`
                    : "—";
                return (
                  <tr key={ex.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/automation/executions/${ex.id}`} className="group">
                        <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {ex.workflow_name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          v{ex.version_number} · {ex.id.slice(0, 8)}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge kind="execution" status={ex.status} />
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 hidden md:table-cell">{ex.trigger}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 hidden lg:table-cell">
                      {ex.started_at ? new Date(ex.started_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 hidden lg:table-cell">{duration}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">{ex.attempt_count}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/automation/executions/${ex.id}`}
                        className="inline-flex px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 text-[11px] font-bold transition-colors"
                      >
                        Trace
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};