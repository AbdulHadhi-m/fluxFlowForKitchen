import React from "react";
import { RestaurantTable } from "../types/table.types";
import { TableCard } from "./TableCard";
import { LayoutGrid } from "lucide-react";

interface TableGridProps {
  tables: RestaurantTable[];
  onEdit: (table: RestaurantTable) => void;
  onStatusClick: (table: RestaurantTable) => void;
}

export const TableGrid: React.FC<TableGridProps> = ({ tables, onEdit, onStatusClick }) => {
  if (tables.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-100/70 dark:bg-slate-900/30">
        <LayoutGrid className="h-10 w-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">No tables configured</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No dining tables match your current filter criteria or none have been added to the floor plan yet.
        </p>
      </div>
    );
  }

  // Group by section
  const sections = Array.from(new Set(tables.map((t) => t.section || "Main Dining")));

  return (
    <div className="space-y-8">
      {sections.map((sectionName) => {
        const sectionTables = tables.filter(
          (t) => (t.section || "Main Dining") === sectionName
        );
        return (
          <div key={sectionName} className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800/60">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {sectionName}
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                ({sectionTables.length} {sectionTables.length === 1 ? "table" : "tables"})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sectionTables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onEdit={onEdit}
                  onStatusClick={onStatusClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
