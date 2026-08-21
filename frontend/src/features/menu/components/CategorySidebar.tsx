import React from "react";
import { MenuCategory } from "../types/menu.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/features/authorization/components/Can";
import { FolderPlus, Layers, Edit2, Folder } from "lucide-react";

interface CategorySidebarProps {
  categories: MenuCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onAddCategory: () => void;
  onEditCategory: (cat: MenuCategory) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onEditCategory,
}) => {
  return (
    <div className="w-full md:w-64 space-y-3 shrink-0">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-emerald-500" /> Categories
        </h3>
        <Can permission="menu.create">
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddCategory}
            className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10"
          >
            <FolderPlus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </Can>
      </div>

      <div className="space-y-1">
        {/* All Items Option */}
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            selectedCategoryId === null
              ? "bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent"
          }`}
        >
          <span className="flex items-center gap-2">
            <Folder className="h-3.5 w-3.5" /> All Categories
          </span>
          <Badge variant="outline" className="text-[10px] py-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            {categories.reduce((acc, c) => acc + (c.item_count || 0), 0)}
          </Badge>
        </button>

        {/* Individual Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <div
              key={cat.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="flex-1 text-left truncate flex items-center gap-2"
              >
                <Folder className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{cat.name}</span>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className="text-[10px] py-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                  {cat.item_count}
                </Badge>
                <Can permission="menu.update">
                  <button
                    type="button"
                    onClick={() => onEditCategory(cat)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-opacity"
                    title="Edit category"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </Can>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
