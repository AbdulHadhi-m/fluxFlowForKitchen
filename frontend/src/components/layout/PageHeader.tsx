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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div className="space-y-1">
        <Breadcrumbs />
        <div className="flex items-center gap-2 pt-1">
          {Icon && (
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
          <h1 className="text-xl font-black tracking-tight text-white">{title}</h1>
        </div>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
