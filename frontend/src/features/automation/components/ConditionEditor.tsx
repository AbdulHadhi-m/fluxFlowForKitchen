import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { CONDITION_FIELD_SUGGESTIONS, CONDITION_OPERATORS } from "../constants/automation.constants";
import { ConditionOperator } from "../types/automation.types";

type ConditionSpec = Record<string, any>;

interface Props {
  value: ConditionSpec;
  onChange: (value: ConditionSpec) => void;
  depth?: number;
}

const inputCls =
  "bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-full";

const isSingleCondition = (node: ConditionSpec): boolean =>
  Boolean(node && typeof node === "object" && node.field !== undefined);

export const ConditionEditor: React.FC<Props> = ({ value, onChange, depth = 0 }) => {
  const node: ConditionSpec = value || { operator: "AND", conditions: [] };

  if (isSingleCondition(node)) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${depth > 0 ? "pl-3 border-l-2 border-slate-700 ml-2" : ""}`}>
        <input
          className={inputCls + " flex-1 min-w-[160px]"}
          list="condition-fields"
          placeholder="field (e.g. payload.total_amount)"
          value={node.field ?? ""}
          onChange={(e) => onChange({ ...node, field: e.target.value })}
        />
        <datalist id="condition-fields">
          {CONDITION_FIELD_SUGGESTIONS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <select
          className={inputCls + " w-[170px]"}
          value={node.operator ?? ""}
          onChange={(e) => onChange({ ...node, operator: e.target.value })}
        >
          <option value="">operator…</option>
          {CONDITION_OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
        <input
          className={inputCls + " flex-1 min-w-[120px]"}
          placeholder="value"
          value={
            Array.isArray(node.value)
              ? node.value.join(", ")
              : node.value === undefined || node.value === null
                ? ""
                : String(node.value)
          }
          onChange={(e) => {
            const raw = e.target.value;
            const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
            let next: any = raw;
            if (node.operator === "IN" || node.operator === "NOT_IN" || node.operator === "BETWEEN") {
              next = parts.length === 1 ? parts[0] : parts;
            } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
              next = Number(raw);
            } else if (raw === "true") {
              next = true;
            } else if (raw === "false") {
              next = false;
            }
            onChange({ ...node, value: next });
          }}
        />
        <button
          onClick={() => onChange({ operator: "AND", conditions: [] })}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
          title="Convert to group"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onChange({ operator: "AND", conditions: [] })}
          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
          title="Reset"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const groupOp = node.operator ?? "AND";
  const children: ConditionSpec[] = Array.isArray(node.conditions) ? node.conditions : [];

  return (
    <div className={`space-y-2 ${depth > 0 ? "pl-3 border-l-2 border-slate-700 ml-2" : ""}`}>
      <div className="flex items-center gap-2">
        <select
          className={inputCls + " w-[90px]"}
          value={groupOp}
          onChange={(e) => onChange({ ...node, operator: e.target.value })}
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
          <option value="NOT">NOT</option>
        </select>
        <span className="text-[10px] text-slate-500">
          group · {children.length} condition{children.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={() => onChange({ ...node, conditions: [...children, { operator: "AND", conditions: [] }] })}
          className="ml-auto px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold"
        >
          + Add Condition
        </button>
        <button
          onClick={() => onChange({ ...node, conditions: [...children, { field: "", operator: "EQUALS", value: "" }] })}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
        >
          + Add Rule
        </button>
      </div>

      {children.length === 0 && (
        <div className="text-[11px] text-slate-600 italic pl-1">
          Empty group — add a rule or condition. (Empty AND group evaluates true.)
        </div>
      )}

      {children.map((child, i) => (
        <div key={i} className="relative">
          <ConditionEditor value={child} onChange={(next) => {
            const nextChildren = [...children];
            nextChildren[i] = next;
            onChange({ ...node, conditions: nextChildren });
          }} depth={depth + 1} />
          <button
            onClick={() => {
              const nextChildren = children.filter((_, idx) => idx !== i);
              onChange({ ...node, conditions: nextChildren });
            }}
            className="absolute -right-2 top-1/2 -translate-y-1/2 p-1 rounded-md bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400"
            title="Remove"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const conditionOperatorLabel = (op: string): string =>
  CONDITION_OPERATORS.find((o) => o.value === op)?.label || op;

export const isConditionOperator = (op: string): op is ConditionOperator =>
  CONDITION_OPERATORS.some((o) => o.value === op);