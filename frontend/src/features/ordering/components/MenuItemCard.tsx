import React from 'react';
import { PublicMenuItem } from '../types/ordering.types';
import { Plus, AlertCircle } from 'lucide-react';

interface MenuItemCardProps {
  item: PublicMenuItem;
  currency?: string;
  cartQuantity: number;
  onAddToCart: (item: PublicMenuItem) => void;
  onOpenDetails: (item: PublicMenuItem) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  cartQuantity,
  onAddToCart,
  onOpenDetails,
}) => {
  return (
    <div className="group bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-xl relative overflow-hidden">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3
            onClick={() => onOpenDetails(item)}
            className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-amber-400 cursor-pointer transition-colors"
          >
            {item.name}
          </h3>
          <span className="text-base font-extrabold text-amber-400 whitespace-nowrap">
            ${parseFloat(item.price).toFixed(2)}
          </span>
        </div>

        {item.description && (
          <p
            onClick={() => onOpenDetails(item)}
            className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 cursor-pointer"
          >
            {item.description}
          </p>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
        {!item.is_available ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> Out of stock
          </span>
        ) : (
          <div className="flex items-center gap-2 w-full justify-end">
            {cartQuantity > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/30">
                {cartQuantity} in cart
              </span>
            )}
            <button
              onClick={() => onAddToCart(item)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-sm hover:shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
