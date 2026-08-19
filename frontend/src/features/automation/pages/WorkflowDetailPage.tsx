import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Pause,
  Archive,
  RotateCcw,
  GitBranch,
  Plus,
  Trash2,
  PenLine,
} from "lucide-react";
import {
  useDeleteWorkflow,
  useExecuteWorkflow,
  useWorkflow,
  useWorkflowStateAction,
  useExecutions,
} from "../hooks/useAutomation";
import { StatusBadge } from "../components/StatusBadge";
import { StepNode } from "../components/StepNode";
import { WORKFLOW_CATEGORY_LABELS, WORKFLOW_TRIGGER_LABELS } from "../constants/automation.constants";
import { ConditionEditor } from "../components/ConditionEditor";

const actionBtn =
  "px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition-colors flex items-center gap-1.5";

export const WorkflowDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workflow, isLoading } = useWorkflow(id || "");
  const stateAction = useWorkflowStateAction();
  const executeWorkflow = useExecuteWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const { data: executions } = useExecutions({ workflow_id: id });

  const recentExecutions = (executions || []).slice(0, 5);

  const handleState = (action: "activate" | "pause" | "archive" | "resume") => {
    if (!id) return;
    if (action === "archive" && !window.confirm(`Archive "${workflow?.name}"?`)) return;
    stateAction.mutate({ id, action });
  };

  const handleExecute = () => {
    if (!id) return;
    const raw = window.prompt("Manual input JSON (optional):", "{}");
    if (raw === null) return;
    try {
      executeWorkflow.mutate({ id, input: JSON.parse(raw || "{}") });
    } catch {
      executeWorkflow.mutate({ id, input: {} });
    }
  };

  const handleDelete = () => {
    if (!id || !window.confirm(`Delete draft "${workflow?.name}"? This cannot be undone.`)) return;
    deleteWorkflow.mutate(id, { onSuccess: () => navigate("/automation/workflows") });
  };

  if (isLoading || !workflow) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="h-10 w-64 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to="/automation/workflows"
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">{workflow.name}</h1>
            <StatusBadge kind="workflow" status={workflow.status} />
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            {workflow.code} · {WORKFLOW_CATEGORY_LABELS[workflow.category] || workflow.category} ·{" "}
            {WORKFLOW_TRIGGER_LABELS[workflow.trigger_type] || workflow.trigger_type}
            {workflow.active_version_number ? ` · v${workflow.active_version_number}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {workflow.status !== "DRAFT" && (
            <button onClick={handleExecute} className={actionBtn + " bg-emerald-600/80 hover:bg-emerald-600 text-white"}>
              <Play className="h-3.5 w-3.5" /> Run Manually
            </button>
          )}
          {workflow.status === "ACTIVE" && (
            <button onClick={() => handleState("pause")} className={actionBtn}>
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}
          {workflow.status === "PAUSED" && (
            <button onClick={() => handleState("resume")} className={actionBtn}>
              <RotateCcw className="h-3.5 w-3.5" /> Resume
            </button>
          )}
          {workflow.status !== "ARCHIVED" && (
            <button onClick={() => handleState("archive")} className={actionBtn}>
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          )}
          <Link to={`/automation/workflows/${workflow.id}/edit`} className={actionBtn}>
            <PenLine className="h-3.5 w-3.5" /> Edit
          </Link>
          {workflow.status === "DRAFT" && (
            <button onClick={handleDelete} className={actionBtn + " hover:bg-rose-500/20 hover:text-rose-400"}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Description</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {workflow.description || "No description provided."}
            </p>
          </div>

          {workflow.steps && workflow.steps.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Steps ({workflow.steps.length})</h3>
              <div className="space-y-2">
                {workflow.steps.map((step, i) => (
                  <StepNode key={`${step.code}-₹{i}`} step={step} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-2.5 text-xs">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Configuration</h3>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Version</span>
              <span className="text-slate-900 dark:text-white font-mono">
                {workflow.active_version_number ? `v${workflow.active_version_number}` : "Unpublished"}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Versions</span>
              <span className="text-slate-900 dark:text-white">{workflow.version_count}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Runs</span>
              <span className="text-slate-900 dark:text-white">{workflow.execution_count}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Timeout</span>
              <span className="text-slate-900 dark:text-white">{workflow.timeout_minutes} min</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Max Steps</span>
              <span className="text-slate-900 dark:text-white">{workflow.max_steps}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Max Retries</span>
              <span className="text-slate-900 dark:text-white">{workflow.max_retries}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Updated</span>
              <span className="text-slate-900 dark:text-white">{new Date(workflow.updated_at).toLocaleString()}</span>
            </div>
            {workflow.created_by_name && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Created By</span>
                <span className="text-slate-900 dark:text-white">{workflow.created_by_name}</span>
              </div>
            )}
          </div>

          {Object.keys(workflow.conditions || {}).length > 0 && (
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Preconditions</h3>
              <ConditionEditor value={workflow.conditions} onChange={() => {}} />
            </div>
          )}

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-cyan-400" /> Recent Executions
            </h3>
            {recentExecutions.length === 0 ? (
              <div className="text-[11px] text-slate-600 py-2">No executions yet.</div>
            ) : (
              <div className="space-y-2">
                {recentExecutions.map((ex) => (
                  <Link
                    key={ex.id}
                    to={`/automation/executions/${ex.id}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-200 dark:bg-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-mono truncate">{ex.id.slice(0, 8)}</span>
                    <span className="text-[10px] text-slate-500">{ex.trigger}</span>
                    <StatusBadge kind="execution" status={ex.status} />
                  </Link>
                ))}
              </div>
            )}
            <Link
              to={`/automation/executions?workflow_id=${workflow.id}`}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              <Plus className="h-3 w-3" /> View all executions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};