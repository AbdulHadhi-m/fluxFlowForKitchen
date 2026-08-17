import React from "react";
import { Link } from "react-router-dom";
import {
  Workflow,
  Zap,
  CheckCircle2,
  Users,
  LayoutTemplate,
  ArrowRight,
  Plus,
  GitBranch,
  ClipboardList,
} from "lucide-react";
import { useAutomationAnalytics, useWorkflows } from "../hooks/useAutomation";
import { AutomationMetricsCards } from "../components/AutomationMetricsCards";
import { StatusBadge } from "../components/StatusBadge";
import { WORKFLOW_CATEGORY_LABELS } from "../constants/automation.constants";

export const AutomationDashboardPage: React.FC = () => {
  const { data: analytics, isLoading: isAnalyticsLoading } = useAutomationAnalytics();
  const { data: workflows, isLoading: isWorkflowsLoading } = useWorkflows();

  const recentWorkflows = (workflows || []).slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30">
              <Zap className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Automation & Workflows</h1>
          </div>
          <p className="text-xs text-slate-400">
            Event-driven business rules, approval gates, scheduled jobs, and manual runs across the restaurant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/automation/templates"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <LayoutTemplate className="h-4 w-4" />
            <span>Templates</span>
          </Link>
          <Link
            to="/automation/workflows/new"
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/30 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Workflow</span>
          </Link>
        </div>
      </div>

      <AutomationMetricsCards analytics={analytics} isLoading={isAnalyticsLoading} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link
          to="/automation/workflows"
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
              <Workflow className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">Workflows</div>
              <div className="text-[10px] text-slate-500">Design & publish</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
        </Link>

        <Link
          to="/automation/executions"
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
              <GitBranch className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Executions</div>
              <div className="text-[10px] text-slate-500">Run history & traces</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
        </Link>

        <Link
          to="/automation/approvals"
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-violet-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">Approvals</div>
              <div className="text-[10px] text-slate-500">{analytics?.pending_approvals ?? 0} pending</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
        </Link>

        <Link
          to="/automation/tasks"
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-pink-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors">Tasks</div>
              <div className="text-[10px] text-slate-500">Automation follow-ups</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-pink-400 transition-colors" />
        </Link>

        <Link
          to="/automation/analytics"
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Analytics</div>
              <div className="text-[10px] text-slate-500">KPIs & failures</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            <span>Recently Updated Workflows</span>
          </h3>
          <Link to="/automation/workflows" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold">
            View All →
          </Link>
        </div>

        {isWorkflowsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : recentWorkflows.length === 0 ? (
          <div className="py-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500">
            No workflows yet. Start from a template or click "New Workflow" above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentWorkflows.map((wf) => (
              <Link
                key={wf.id}
                to={`/automation/workflows/${wf.id}`}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                      {wf.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{wf.code}</div>
                  </div>
                  <StatusBadge kind="workflow" status={wf.status} />
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">{wf.description || "No description"}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{WORKFLOW_CATEGORY_LABELS[wf.category] || wf.category}</span>
                  <span>
                    {wf.active_version_number ? `v${wf.active_version_number}` : "Draft"} · {wf.execution_count} runs
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};