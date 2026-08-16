import React from "react";

interface AuditDiffViewerProps {
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
}

export const AuditDiffViewer: React.FC<AuditDiffViewerProps> = ({
  beforeData = {},
  afterData = {},
}) => {
  const allKeys = Array.from(new Set([...Object.keys(beforeData), ...Object.keys(afterData)]));

  if (allKeys.length === 0) {
    return <span className="text-xs text-slate-500 italic">No field changes captured.</span>;
  }

  return (
    <div className="space-y-1.5 overflow-x-auto text-xs font-mono">
      <div className="grid grid-cols-3 gap-2 pb-1 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase">
        <span>Field</span>
        <span>Before</span>
        <span>After</span>
      </div>

      {allKeys.map((key) => {
        const beforeVal = beforeData[key];
        const afterVal = afterData[key];
        const isChanged = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);

        return (
          <div
            key={key}
            className={`grid grid-cols-3 gap-2 p-1.5 rounded ${
              isChanged ? "bg-amber-500/10 border border-amber-500/20" : "hover:bg-slate-800/40"
            }`}
          >
            <span className="font-bold text-slate-300 truncate">{key}</span>
            <span className="text-rose-400/90 truncate">
              {beforeVal !== undefined ? JSON.stringify(beforeVal) : "—"}
            </span>
            <span className="text-emerald-400 truncate">
              {afterVal !== undefined ? JSON.stringify(afterVal) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
};
