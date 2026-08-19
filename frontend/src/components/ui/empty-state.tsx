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
    <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700/70 my-4">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500/30 blur-lg rounded-full" />
        <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
