import React from "react";
import { WORKFLOW_ACTIONS } from "../constants/automation.constants";
import { WorkflowStep } from "../types/automation.types";
import { ConditionEditor } from "./ConditionEditor";

const inputCls =
  "bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-full";
const labelCls = "text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block";

interface Props {
  step: WorkflowStep;
  onChange: (patch: Partial<WorkflowStep>) => void;
  availableSteps: string[];
}

export const StepConfigEditor: React.FC<Props> = ({ step, onChange, availableSteps }) => {
  const config = step.config || {};
  const setConfig = (patch: Record<string, any>) => onChange({ config: { ...config, ...patch } });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Step Code</label>
          <input
            className={inputCls}
            value={step.code}
            onChange={(e) => onChange({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })}
          />
        </div>
        <div>
          <label className={labelCls}>Step Name</label>
          <input className={inputCls} value={step.name} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
      </div>

      {step.type === "ACTION" && (
        <div className="space-y-2">
          <div>
            <label className={labelCls}>Action</label>
            <select
              className={inputCls}
              value={config.action ?? ""}
              onChange={(e) => setConfig({ action: e.target.value })}
            >
              <option value="">Select action…</option>
              {WORKFLOW_ACTIONS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name} ({a.code})
                </option>
              ))}
            </select>
          </div>
          {(() => {
            const action = WORKFLOW_ACTIONS.find((a) => a.code === config.action);
            if (!action) {
              return (
                <p className="text-[10px] text-slate-600">
                  Pick an action from the allowlist. Config may reference event data with{" "}
                  <code className="text-indigo-400">{"{{payload.field}}"}</code>.
                </p>
              );
            }
            return (
              <div className="space-y-2">
                {action.fields.map((field) => {
                  const val = config[field.key];
                  return (
                    <div key={field.key}>
                      <label className={labelCls}>{field.label}</label>
                      {field.type === "select" ? (
                        <select
                          className={inputCls}
                          value={typeof val === "string" ? val : ""}
                          onChange={(e) => setConfig({ [field.key]: e.target.value })}
                        >
                          <option value="">—</option>
                          {field.options?.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className={inputCls}
                          type={field.type === "number" ? "number" : "text"}
                          placeholder={field.key}
                          value={
                            typeof val === "number" || typeof val === "string" ? String(val) : ""
                          }
                          onChange={(e) => {
                            const raw = e.target.value;
                            const next = field.type === "number" ? Number(raw) : raw;
                            setConfig({ [field.key]: next });
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {step.type === "APPROVAL" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Approver Role</label>
            <input
              className={inputCls}
              placeholder="MANAGER / RESTAURANT_ADMIN"
              value={config.approver_role ?? ""}
              onChange={(e) => setConfig({ approver_role: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Approver ID (optional)</label>
            <input
              className={inputCls}
              value={config.approver_id ?? ""}
              onChange={(e) => setConfig({ approver_id: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Reason</label>
            <input
              className={inputCls}
              value={config.reason ?? ""}
              onChange={(e) => setConfig({ reason: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Amount</label>
            <input
              className={inputCls}
              placeholder="e.g. {{payload.total_amount}}"
              value={typeof config.amount === "string" || typeof config.amount === "number" ? String(config.amount) : ""}
              onChange={(e) => setConfig({ amount: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Expiry Hours</label>
            <input
              className={inputCls}
              type="number"
              value={config.expiry_hours ?? 24}
              onChange={(e) => setConfig({ expiry_hours: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {step.type === "WAIT" && (
        <div>
          <label className={labelCls}>Duration (seconds)</label>
          <input
            className={inputCls}
            type="number"
            value={config.duration_seconds ?? 3600}
            onChange={(e) => setConfig({ duration_seconds: Number(e.target.value) })}
          />
          <p className="text-[10px] text-slate-600 mt-1">
            Execution pauses and resumes automatically when the delay elapses.
          </p>
        </div>
      )}

      {step.type === "CONDITION" && (
        <div>
          <label className={labelCls}>Condition Rules</label>
          <ConditionEditor
            value={config.condition || {}}
            onChange={(condition) => setConfig({ condition })}
          />
        </div>
      )}

      {step.type === "BRANCH" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Condition Rules</label>
            <ConditionEditor
              value={config.condition || {}}
              onChange={(condition) => setConfig({ condition })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>On True</label>
              <select className={inputCls} value={step.on_true ?? ""} onChange={(e) => onChange({ on_true: e.target.value })}>
                <option value="">—</option>
                {availableSteps.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>On False</label>
              <select className={inputCls} value={step.on_false ?? ""} onChange={(e) => onChange({ on_false: e.target.value })}>
                <option value="">—</option>
                {availableSteps.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Next Step</label>
        <select className={inputCls} value={step.next ?? ""} onChange={(e) => onChange({ next: e.target.value })}>
          <option value="">(next step in order)</option>
          {availableSteps.filter((s) => s !== step.code).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};