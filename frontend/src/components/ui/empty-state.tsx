import React from "react";
import { Button } from "./button";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800/80 my-4">
      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
