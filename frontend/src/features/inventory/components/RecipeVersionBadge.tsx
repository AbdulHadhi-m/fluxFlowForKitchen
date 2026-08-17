import React from 'react';
import { RecipeStatus } from '../types/inventory.types';

interface RecipeVersionBadgeProps {
  status: RecipeStatus;
  version: number;
}

export const RecipeVersionBadge: React.FC<RecipeVersionBadgeProps> = ({ status, version }) => {
  const getStyles = () => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DRAFT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ARCHIVED':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyles()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      v{version} • {status}
    </span>
  );
};
