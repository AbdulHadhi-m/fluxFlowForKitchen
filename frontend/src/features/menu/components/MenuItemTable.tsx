import React from "react";
import { MenuItem } from "../types/menu.types";
import { AvailabilityToggle } from "./AvailabilityToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/features/authorization/components/Can";
import { Edit2, UtensilsCrossed } from "lucide-react";

interface MenuItemTableProps {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
}

export const MenuItemTable: React.FC<MenuItemTableProps> = ({ items, onEdit }) => {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/30">
        <UtensilsCrossed className="h-10 w-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">No menu items found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No catalog items match your search or filter criteria in this category.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
      <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
        <thead className="bg-slate-100 dark:bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="py-3.5 px-4 font-semibold">Item Details</th>
            <th className="py-3.5 px-4 font-semibold">Category</th>
            <th className="py-3.5 px-4 font-semibold">Price</th>
            <th className="py-3.5 px-4 font-semibold">Availability</th>
            <th className="py-3.5 px-4 font-semibold">Status</th>
            <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-normal">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/40 transition-colors">
              <td className="py-3 px-4">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                  {item.description && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md line-clamp-1">
                      {item.description}
                    </div>
                  )}
                </div>
              </td>

              <td className="py-3 px-4">
                <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300">
                  {item.category_name}
                </Badge>
              </td>

              <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                ${parseFloat(item.price).toFixed(2)}
              </td>

              <td className="py-3 px-4">
                <AvailabilityToggle item={item} />
              </td>

              <td className="py-3 px-4">
                {item.is_active ? (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Active</span>
                ) : (
                  <span className="text-[11px] text-slate-600 italic">Inactive</span>
                )}
              </td>

              <td className="py-3 px-4 text-right">
                <Can permission="menu.update">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(item)}
                    className="h-7 px-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 text-xs"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                </Can>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
