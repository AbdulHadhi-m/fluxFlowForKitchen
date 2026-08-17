import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RotateCcw, Pause, Play, Ban } from "lucide-react";
import { useExecution, useExecutionAction } from "../hooks/useAutomation";
import { StatusBadge } from "../components/StatusBadge";

const actionBtn =
  "px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors flex items-center gap-1.5";

export const ExecutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: execution, isLoading } = useExecution(id || "");
  const executionAction = useExecutionAction();

  const canRetry = execution?.status === "FAILED" || execution?.status === "CANCELLED";
  const canPause = execution?.status === "RUNNING" || execution?.status === "PENDING" || execution?.status === "WAITING" || execution?.status === "APPROVAL_REQUIRED";
  const canResume = execution?.status === "PAUSED";
  const canCancel = execution?.status === "RUNNING" || execution?.status === "PENDING" || execution?.status === "WAITING" || execution?.status === "APPROVAL_REQUIRED" || execution?.status === "PAUSED";

  if (isLoading || !execution) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="h-10 w-64 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  const duration =
    execution.started_at && execution.completed_at
      ? `${((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000).toFixed(1)}s`
      : "—";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to="/automation/executions"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-white tracking-tight truncate">{execution.workflow_name}</h1>
            <StatusBadge kind="execution" status={execution.status} />
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            {execution.id} · v{execution.version_number} · {execution.trigger} trigger
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canRetry && (
            <button onClick={() => executionAction.mutate({ id: execution.id, action: "retry" })} className={actionBtn}>
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </button>
          )}
          {canPause && (
            <button onClick={() => executionAction.mutate({ id: execution.id, action: "pause" })} className={actionBtn}>
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}
          {canResume && (
            <button onClick={() => executionAction.mutate({ id: execution.id, action: "resume" })} className={actionBtn}>
              <Play className="h-3.5 w-3.5" /> Resume
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => {
                if (window.confirm("Cancel this execution?")) executionAction.mutate({ id: execution.id, action: "cancel" });
              }}
              className={actionBtn + " hover:bg-rose-500/20 hover:text-rose-400"}
            >
              <Ban className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Step Trace</h3>
            {execution.step_executions.length === 0 ? (
              <div className="text-[11px] text-slate-600">No step executions recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {execution.step_executions.map((step) => (
                  <div
                    key={step.id}
                    className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-white font-mono">{step.step_code}</span>
                      <span className="text-[11px] text-slate-400">{step.step_name}</span>
                      <span className="ml-auto">
                        <StatusBadge kind="step" status={step.status} />
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-3">
                      <span>{step.step_type}</span>
                      {step.started_at && <span>started {new Date(step.started_at).toLocaleTimeString()}</span>}
                      {step.duration_seconds != null && <span>{step.duration_seconds}s</span>}
                      {step.retry_count > 0 && <span className="text-amber-400">{step.retry_count} retries</span>}
                    </div>
                    {Object.keys(step.output || {}).length > 0 && (
                      <pre className="mt-2 p-2 rounded-lg bg-slate-900 text-[10px] text-slate-500 font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(step.output, null, 2)}
                      </pre>
                    )}
                    {Object.keys(step.error || {}).length > 0 && (
                      <pre className="mt-2 p-2 rounded-lg bg-rose-500/5 border border-rose-500/20 text-[10px] text-rose-300 font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(step.error, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Input</h3>
              <pre className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(execution.input, null, 2) || "{}"}
              </pre>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Output</h3>
              <pre className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(execution.output, null, 2) || "{}"}
              </pre>
            </div>
          </div>

          {Object.keys(execution.error || {}).length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider mb-2">Error</h3>
              <pre className="text-[10px] text-rose-300/80 font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(execution.error, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 h-fit space-y-2.5 text-xs">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Execution Details</h3>
          <div className="flex justify-between text-slate-400">
            <span>Trigger</span>
            <span className="text-white">{execution.trigger}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Event ID</span>
            <span className="text-white font-mono text-[10px]">{execution.event_id || "—"}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Started</span>
            <span className="text-white">{execution.started_at ? new Date(execution.started_at).toLocaleString() : "—"}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Completed</span>
            <span className="text-white">{execution.completed_at ? new Date(execution.completed_at).toLocaleString() : "—"}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Duration</span>
            <span className="text-white">{duration}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Attempts</span>
            <span className="text-white">{execution.attempt_count}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Depth</span>
            <span className="text-white">{execution.depth}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Resume At</span>
            <span className="text-white">{execution.resume_at ? new Date(execution.resume_at).toLocaleString() : "—"}</span>
          </div>
          {execution.triggered_by_name && (
            <div className="flex justify-between text-slate-400">
              <span>Triggered By</span>
              <span className="text-white">{execution.triggered_by_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};