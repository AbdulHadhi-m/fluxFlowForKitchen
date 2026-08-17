import React from "react";
import { WorkflowStep } from "../types/automation.types";

const STEP_ICON_CLASSES: Record<string, string> = {
  ACTION: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  CONDITION: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVAL: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  WAIT: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  BRANCH: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  END: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const STEP_ICONS: Record<string, string> = {
  ACTION: "⚡",
  CONDITION: "◆",
  APPROVAL: "✓",
  WAIT: "⏳",
  BRANCH: "⇄",
  END: "●",
};

export const StepNode: React.FC<{
  step: WorkflowStep;
  index: number;
  onSelect?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  selected?: boolean;
}> = ({ step, index, onSelect, onRemove, onMoveUp, onMoveDown, selected }) => {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-xl border transition-all cursor-pointer group ${
        selected
          ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/10"
          : "bg-slate-900/60 border-slate-800 hover:border-slate-600"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border text-sm font-bold ${
            STEP_ICON_CLASSES[step.type] || STEP_ICON_CLASSES.ACTION
          }`}
        >
          {STEP_ICONS[step.type] || "•"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-white truncate">{step.name}</div>
          <div className="text-[10px] text-slate-500 truncate font-mono">
            {index + 1}. {step.code} · {step.type}
          </div>
        </div>
        <div className="hidden group-hover:flex items-center gap-1">
          {onMoveUp && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
              title="Move up"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
              title="Move down"
            >
              ↓
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs"
              title="Remove"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {step.config && Object.keys(step.config).length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-800">
          <pre className="text-[10px] text-slate-500 font-mono whitespace-pre-wrap break-all line-clamp-2">
            {JSON.stringify(step.config)}
          </pre>
        </div>
      )}
    </div>
  );
};