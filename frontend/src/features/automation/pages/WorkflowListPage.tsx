import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Workflow, Plus, Search, Play, Pause, Archive, RotateCcw, Trash2 } from "lucide-react";
import { useDeleteWorkflow, useWorkflowStateAction, useWorkflows } from "../hooks/useAutomation";
import { StatusBadge } from "../components/StatusBadge";
import { WORKFLOW_CATEGORY_LABELS, WORKFLOW_TRIGGER_LABELS } from "../constants/automation.constants";
import { Workflow as WorkflowType } from "../types/automation.types";

const stateBtn =
  "p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

export const WorkflowListPage: React.FC = () => {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const { data: workflows, isLoading } = useWorkflows({ search, status: statusFilter || undefined });
  const stateAction = useWorkflowStateAction();
  const deleteWorkflow = useDeleteWorkflow();

  const filtered = (workflows || []).filter(
    (wf) =>
      (!search ||
        wf.name.toLowerCase().includes(search.toLowerCase()) ||
        wf.code.toLowerCase().includes(search.toLowerCase())) &&
      (!statusFilter || wf.status === statusFilter)
  );

  const handleState = (wf: WorkflowType, action: "activate" | "pause" | "archive" | "resume") => {
    if (action === "archive" && !window.confirm(`Archive "${wf.name}"?`)) return;
    stateAction.mutate({ id: wf.id, action });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/automation"
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Workflow className="h-5 w-5 text-cyan-400" />
            <span>Workflows</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Design, publish, activate and monitor automated business rules</p>
        </div>
        <Link
          to="/automation/workflows/new"
          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/30 flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>New Workflow</span>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500/50"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No workflows match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wf) => (
            <div
              key={wf.id}
              className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Link to={`/automation/workflows/${wf.id}`} className="flex-1 min-w-[220px] group">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                      {wf.name}
                    </span>
                    <StatusBadge kind="workflow" status={wf.status} />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{wf.code}</div>
                </Link>
                <div className="text-[10px] text-slate-500 hidden md:block">
                  {WORKFLOW_CATEGORY_LABELS[wf.category] || wf.category}
                  <span className="mx-1.5 text-slate-700">·</span>
                  {WORKFLOW_TRIGGER_LABELS[wf.trigger_type] || wf.trigger_type}
                  <span className="mx-1.5 text-slate-700">·</span>
                  {wf.active_version_number ? `v${wf.active_version_number}` : "unpublished"}
                </div>
                <div className="text-[10px] text-slate-500">{wf.execution_count} runs</div>
                <div className="flex items-center gap-1">
                  {wf.status === "ACTIVE" && (
                    <button className={stateBtn} title="Pause" onClick={() => handleState(wf, "pause")}>
                      <Pause className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(wf.status === "DRAFT" || wf.status === "PAUSED") && wf.active_version_number != null && (
                    <button className={stateBtn} title="Activate" onClick={() => handleState(wf, "activate")}>
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {wf.status === "PAUSED" && (
                    <button className={stateBtn} title="Resume" onClick={() => handleState(wf, "resume")}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {wf.status === "DRAFT" && (
                    <button
                      className={stateBtn + " hover:bg-rose-500/20 hover:text-rose-400"}
                      title="Delete draft"
                      onClick={() => deleteWorkflow.mutate(wf.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {wf.status !== "ARCHIVED" && (
                    <button className={stateBtn} title="Archive" onClick={() => handleState(wf, "archive")}>
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Link
                    to={`/automation/workflows/${wf.id}/edit`}
                    className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-cyan-500/20 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    title="Edit"
                  >
                    <Plus className="h-3.5 w-3.5 rotate-45" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};