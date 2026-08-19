import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutTemplate, Plus, Sparkles } from "lucide-react";
import { useCreateFromTemplate, useTemplates } from "../hooks/useAutomation";
import { WORKFLOW_CATEGORY_LABELS, WORKFLOW_TRIGGER_LABELS } from "../constants/automation.constants";

export const TemplatesPage: React.FC = () => {
  const { data: templates, isLoading } = useTemplates();
  const createFromTemplate = useCreateFromTemplate();
  const navigate = useNavigate();

  const handleInstantiate = (code: string) => {
    const name = window.prompt("Workflow name (leave blank to use template name):", "") || "";
    createFromTemplate.mutate(
      { code, name, scope: "RESTAURANT" },
      {
        onSuccess: (wf) => navigate(`/automation/workflows/${wf.id}/edit`),
      }
    );
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
            <LayoutTemplate className="h-5 w-5 text-pink-400" />
            <span>Workflow Templates</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Battle-tested automation blueprints — instantiate, customize, publish</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (templates || []).length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No templates available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates || []).map((t) => (
            <div
              key={t.code}
              className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-pink-500/40 transition-all flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{t.code}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-3 flex-1">{t.description}</p>
              <div className="text-[10px] text-slate-500 mb-3">
                {WORKFLOW_CATEGORY_LABELS[t.category] || t.category} ·{" "}
                {WORKFLOW_TRIGGER_LABELS[t.trigger_type] || t.trigger_type} · {t.steps.length} steps
              </div>
              <div className="flex flex-wrap gap-1 mb-4">
                {t.steps.map((s) => (
                  <span
                    key={s.code}
                    className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-[9px] font-mono text-slate-500 dark:text-slate-400"
                  >
                    {s.type}
                  </span>
                ))}
              </div>
              <button
                onClick={() => handleInstantiate(t.code)}
                className="w-full px-3 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow-md shadow-pink-600/30 flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Use This Template
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};