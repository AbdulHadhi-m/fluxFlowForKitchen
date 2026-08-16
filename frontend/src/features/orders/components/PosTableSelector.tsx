import React from "react";
import { RestaurantTable } from "@/features/tables/types/table.types";
import { LayoutGrid } from "lucide-react";

interface PosTableSelectorProps {
  tables: RestaurantTable[];
  selectedTableId: string | null;
  onSelectTable: (table: { id: string; name: string } | null) => void;
}

export const PosTableSelector: React.FC<PosTableSelectorProps> = ({
  tables,
  selectedTableId,
  onSelectTable,
}) => {
  // Only display active tables that are not OUT_OF_SERVICE
  const eligibleTables = tables.filter(
    (t) => t.is_active && t.status !== "OUT_OF_SERVICE"
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />
        <span className="hidden sm:inline">Table:</span>
      </div>

      <select
        value={selectedTableId || ""}
        onChange={(e) => {
          const val = e.target.value;
          if (!val) {
            onSelectTable(null);
          } else {
            const tbl = tables.find((t) => t.id === val);
            if (tbl) {
              onSelectTable({ id: tbl.id, name: tbl.name });
            }
          }
        }}
        className="h-8 rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Takeaway / No Table</option>
        {eligibleTables.map((tbl) => (
          <option key={tbl.id} value={tbl.id}>
            {tbl.name} ({tbl.section || "Main"} - {tbl.capacity} seats) {tbl.status === "OCCUPIED" ? "• Occupied" : ""}
          </option>
        ))}
      </select>
    </div>
  );
};
