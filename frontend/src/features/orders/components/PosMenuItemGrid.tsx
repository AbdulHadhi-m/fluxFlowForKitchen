import { MenuItem } from "@/features/menu/types/menu.types";
import { Plus, UtensilsCrossed } from "lucide-react";

interface PosMenuItemGridProps {
  items: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
}

export const PosMenuItemGrid: React.FC<PosMenuItemGridProps> = ({ items, onSelectItem }) => {
  // Only display active & available items in POS catalog
  const availableItems = items.filter((i) => i.is_active && i.is_available);

  if (availableItems.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-100/70 dark:bg-slate-900/30 flex-1">
        <UtensilsCrossed className="h-10 w-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">No available menu items</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No active or in-stock menu items found for this category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
      {availableItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelectItem(item)}
          className="group card-lift flex flex-col justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-left transition-all backdrop-blur-sm"
        >
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-1">
              {item.name}
            </div>
            {item.description && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                {item.description}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 w-full">
            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
              ${parseFloat(item.price).toFixed(2)}
            </span>
            <span className="h-6 w-6 rounded-lg bg-blue-600/20 group-hover:bg-blue-600 text-blue-400 group-hover:text-white flex items-center justify-center transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};
