import React from "react";
import { Breadcrumbs } from "./Breadcrumbs";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div className="space-y-1.5">
        <Breadcrumbs />
        <div className="flex items-center gap-2.5 pt-1">
          {Icon && (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h1>
        </div>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
