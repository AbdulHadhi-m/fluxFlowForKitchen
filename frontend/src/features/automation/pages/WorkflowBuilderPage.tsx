import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle2, Rocket, Play, AlertTriangle } from "lucide-react";
import {
  useCreateWorkflow,
  usePublishWorkflow,
  useUpdateWorkflow,
  useValidateWorkflow,
  useWorkflow,
} from "../hooks/useAutomation";
import { useWorkflowBuilderStore, generateStepCode } from "../store/workflowBuilderStore";
import { StepNode } from "../components/StepNode";
import { StepConfigEditor } from "../components/StepConfigEditor";
import {
  WORKFLOW_CATEGORY_LABELS,
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_TRIGGER_LABELS,
} from "../constants/automation.constants";
import { WorkflowPayload, WorkflowStep, WorkflowStatus } from "../types/automation.types";

const inputCls =
  "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 w-full";
const labelCls = "text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block";

const emptyCondition = { operator: "AND", conditions: [] };

const newStepFor = (type: WorkflowStep["type"], index: number): WorkflowStep => {
  const base = {
    code: generateStepCode(`${type}_${index + 1}`),
    name: `${type} Step ${index + 1}`,
    type,
    config: {},
  };
  if (type === "ACTION") return { ...base, config: { action: "" } };
  if (type === "APPROVAL") return { ...base, config: { approver_role: "MANAGER", expiry_hours: 24 } };
  if (type === "WAIT") return { ...base, config: { duration_seconds: 3600 } };
  if (type === "CONDITION") return { ...base, config: { condition: emptyCondition } };
  if (type === "BRANCH") return { ...base, config: { condition: emptyCondition } };
  return base;
};

export const WorkflowBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: existing, isLoading: isLoadingExisting } = useWorkflow(id || "");
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const publishWorkflow = usePublishWorkflow();
  const validateWorkflow = useValidateWorkflow();

  const { steps, setSteps, addStep, updateStep, removeStep, moveStep } = useWorkflowBuilderStore();
  const [selectedCode, setSelectedCode] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<WorkflowPayload>({
    name: "",
    code: "",
    description: "",
    category: "OPERATIONS",
    trigger_type: "EVENT",
    trigger_config: {},
    scope: "RESTAURANT",
    conditions: emptyCondition,
  });
  const [triggerEvents, setTriggerEvents] = React.useState<string[]>([]);
  const [error, setError] = React.useState("");
  const [validation, setValidation] = React.useState<{ valid: boolean; errors: string[] } | null>(null);

  React.useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        code: existing.code,
        description: existing.description,
        category: existing.category,
        trigger_type: existing.trigger_type,
        trigger_config: existing.trigger_config,
        scope: existing.scope,
        conditions: existing.conditions || emptyCondition,
      });
      setTriggerEvents((existing.trigger_config?.event_types as string[]) || []);
      setSteps(existing.steps && existing.steps.length > 0 ? existing.steps : []);
    }
  }, [existing, isEdit, setSteps]);

  React.useEffect(() => {
    if (steps.length > 0 && !steps.some((s) => s.code === selectedCode)) {
      setSelectedCode(steps[steps.length - 1].code);
    } else if (steps.length === 0) {
      setSelectedCode(null);
    }
  }, [steps, selectedCode]);

  const saveDraft = () => {
    setError("");
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and Code are required.");
      return;
    }
    const payload: WorkflowPayload = {
      ...form,
      trigger_config: {
        ...(form.trigger_config || {}),
        event_types: triggerEvents,
      },
      steps,
    };
    if (isEdit && id) {
      updateWorkflow.mutate(
        { id, payload },
        { onSuccess: () => navigate(`/automation/workflows/${id}`), onError: (err: any) => setError(err?.message || "Update failed") }
      );
    } else {
      createWorkflow.mutate(payload, {
        onSuccess: (wf) => navigate(`/automation/workflows/${wf.id}`),
        onError: (err: any) => setError(err?.message || "Create failed"),
      });
    }
  };

  const handleValidate = () => {
    if (!id) return;
    validateWorkflow.mutate(id, {
      onSuccess: (res) => setValidation(res),
      onError: (err: any) => setError(err?.message || "Validation failed"),
    });
  };

  const handlePublish = () => {
    if (!id) return;
    publishWorkflow.mutate(
      { id, changelog: window.prompt("Changelog for this version (optional):") || "" },
      { onSuccess: () => navigate(`/automation/workflows/${id}`) }
    );
  };

  const status: WorkflowStatus = existing?.status || "DRAFT";
  const selectedStep = steps.find((s) => s.code === selectedCode) || null;
  const stepCodes = steps.map((s) => s.code);
  const availableSteps = stepCodes.filter((s) => s !== selectedCode);

  if (isEdit && isLoadingExisting) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="h-10 w-64 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link
          to={isEdit ? `/automation/workflows/${id}` : "/automation/workflows"}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {isEdit ? `Edit: ${existing?.name || ""}` : "New Workflow"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define a trigger, optional preconditions, then chain steps (actions, conditions, approvals, waits).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && (
            <button
              onClick={handleValidate}
              className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Validate</span>
            </button>
          )}
          <button
            onClick={saveDraft}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/30 flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span>{isEdit ? "Save Changes" : "Create Draft"}</span>
          </button>
          {isEdit && status === "DRAFT" && (
            <button
              onClick={handlePublish}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
            >
              <Rocket className="h-4 w-4" />
              <span>Publish v{(existing?.version_count || 0) + 1}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}
      {validation && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl border text-xs ${
            validation.valid
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300"
          }`}
        >
          {validation.valid ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Definition is valid.
            </span>
          ) : (
            <div className="space-y-1">
              {validation.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {e}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Low Stock Alert"
              />
            </div>
            <div>
              <label className={labelCls}>Code *</label>
              <input
                className={inputCls + " font-mono"}
                value={form.code}
                disabled={isEdit}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })
                }
                placeholder="LOW_STOCK_ALERT"
              />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                className={inputCls + " min-h-[64px]"}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What should this automation do?"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Category</label>
                <select
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as WorkflowPayload["category"] })}
                >
                  {Object.entries(WORKFLOW_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Scope</label>
                <select
                  className={inputCls}
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value as WorkflowPayload["scope"] })}
                >
                  <option value="RESTAURANT">This Restaurant</option>
                  <option value="GLOBAL">Global</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Trigger</label>
              <select
                className={inputCls}
                value={form.trigger_type}
                onChange={(e) => setForm({ ...form, trigger_type: e.target.value as WorkflowPayload["trigger_type"] })}
              >
                {Object.entries(WORKFLOW_TRIGGER_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {form.trigger_type === "EVENT" && (
              <div>
                <label className={labelCls}>Event Types</label>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {WORKFLOW_EVENT_TYPES.map((evt) => (
                    <label key={evt} className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        className="accent-cyan-500"
                        checked={triggerEvents.includes(evt)}
                        onChange={(e) =>
                          setTriggerEvents((prev) =>
                            e.target.checked ? [...prev, evt] : prev.filter((t) => t !== evt)
                          )
                        }
                      />
                      <span className="font-mono">{evt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {form.trigger_type === "SCHEDULE" && (
              <div>
                <label className={labelCls}>Cron Expression</label>
                <input
                  className={inputCls + " font-mono"}
                  placeholder="0 6 * * * (daily 6am)"
                  value={(form.trigger_config?.cron || "") as string}
                  onChange={(e) => setForm({ ...form, trigger_config: { ...form.trigger_config, cron: e.target.value } })}
                />
              </div>
            )}

            {form.trigger_type === "MANUAL" && (
              <p className="text-[11px] text-slate-600">
                This workflow runs only when an authorized user executes it manually.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Steps</h3>
              <div className="flex items-center gap-1.5">
                {(["ACTION", "CONDITION", "APPROVAL", "WAIT", "BRANCH", "END"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => addStep(newStepFor(type, steps.length))}
                    className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-cyan-500/20 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 text-[10px] font-bold transition-colors"
                  >
                    + {type}
                  </button>
                ))}
              </div>
            </div>

            {steps.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                No steps yet. Add an ACTION, CONDITION, APPROVAL, WAIT, BRANCH or END step above.
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <StepNode
                    key={`${step.code}-${i}`}
                    step={step}
                    index={i}
                    selected={selectedCode === step.code}
                    onSelect={() => setSelectedCode(step.code)}
                    onRemove={() => {
                      if (steps.length > 1) removeStep(step.code);
                    }}
                    onMoveUp={() => moveStep(i, i - 1)}
                    onMoveDown={() => moveStep(i, i + 1)}
                  />
                ))}
              </div>
            )}
          </div>

          {selectedStep && (
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Configure: {selectedStep.name}
              </h3>
              <StepConfigEditor
                step={selectedStep}
                availableSteps={availableSteps}
                onChange={(patch) => updateStep(selectedStep.code, patch)}
              />
            </div>
          )}

          {isEdit && status === "DRAFT" && (
            <button
              onClick={handlePublish}
              className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
            >
              <Play className="h-4 w-4" />
              <span>Publish & Activate Workflow</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};