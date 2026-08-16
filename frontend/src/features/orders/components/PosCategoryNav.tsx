import React from "react";
import { MenuCategory } from "@/features/menu/types/menu.types";
import { Layers } from "lucide-react";

interface PosCategoryNavProps {
  categories: MenuCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export const PosCategoryNav: React.FC<PosCategoryNavProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 w-full md:w-48 shrink-0">
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap ${
          selectedCategoryId === null
            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
            : "bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80"
        }`}
      >
        <Layers className="h-3.5 w-3.5 shrink-0" />
        <span>All Items</span>
      </button>

      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left whitespace-nowrap ${
              isSelected
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80"
            }`}
          >
            <span className="truncate">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
};
