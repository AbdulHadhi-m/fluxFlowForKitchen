import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { useUpdateTask, useWorkflowTasks } from "../hooks/useAutomation";
import { StatusBadge } from "../components/StatusBadge";
import { WorkflowTask } from "../types/automation.types";

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  NORMAL: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  HIGH: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  URGENT: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export const TasksPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = React.useState("");
  const { data: tasks, isLoading } = useWorkflowTasks({ status: statusFilter || undefined });
  const updateTask = useUpdateTask();

  const cycleStatus = (task: WorkflowTask) => {
    const order: WorkflowTask["status"][] = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"];
    const idx = order.indexOf(task.status);
    const next = order[(idx + 1) % order.length];
    updateTask.mutate({ id: task.id, payload: { status: next } });
  };

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
            <ClipboardList className="h-5 w-5 text-pink-400" />
            <span>Automation Tasks</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Follow-up tasks created by workflows — click status to cycle it</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["", "OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].map((s) => (
          <button
            key={s || "ALL"}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors border ${
              statusFilter === s
                ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {s || "ALL"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (tasks || []).length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No tasks found.
        </div>
      ) : (
        <div className="space-y-3">
          {(tasks || []).map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-pink-500/30 transition-all"
            >
              <div className="flex flex-wrap items-start gap-3">
                <button
                  onClick={() => cycleStatus(t)}
                  className="mt-0.5"
                  title="Click to cycle status"
                >
                  <StatusBadge kind="approval" status={t.status as any} />
                </button>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</div>
                  {t.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t.description}</p>}
                  <div className="text-[10px] text-slate-600 mt-2 flex flex-wrap gap-x-3">
                    <span className="font-mono">{t.id.slice(0, 8)}</span>
                    <span>{t.category}</span>
                    {t.assignee_name && <span>Assignee: {t.assignee_name}</span>}
                    {t.due_at && <span>Due: {new Date(t.due_at).toLocaleString()}</span>}
                    <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase ${
                    PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.NORMAL
                  }`}
                >
                  {t.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};