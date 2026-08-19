import React, { useState } from "react";
import { useInventoryMovements } from "../hooks/useInventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Search,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MovementType, StockMovement } from "../types/inventory.types";

export const StockMovementsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");

  const { data: movements = [], isLoading: isLoadingMovements } = useInventoryMovements();

  const filteredMovements = movements.filter((m: StockMovement) => {
    const matchesSearch =
      !searchQuery ||
      (m.reason && m.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.reference_id && m.reference_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.created_by_name && m.created_by_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = !selectedType || m.movement_type === selectedType;
    return matchesSearch && matchesType;
  });

  const getMovementBadge = (type: MovementType, qty: string, unit: string) => {
    const numQty = parseFloat(qty);
    switch (type) {
      case "PURCHASE":
      case "OPENING":
        return (
          <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px]">
            <ArrowDownLeft className="h-3 w-3" /> +{numQty} {unit}
          </span>
        );
      case "CONSUMPTION":
        return (
          <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-[11px]">
            <ArrowUpRight className="h-3 w-3" /> {numQty} {unit}
          </span>
        );
      case "WASTAGE":
        return (
          <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[11px]">
            <Trash2 className="h-3 w-3" /> {numQty} {unit}
          </span>
        );
      case "ADJUSTMENT_IN":
      case "ADJUSTMENT_OUT":
        return (
          <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
            <SlidersHorizontal className="h-3 w-3" /> {numQty > 0 ? `+${numQty}` : numQty} {unit}
          </span>
        );
      case "RETURN":
        return (
          <span className="inline-flex items-center gap-1 font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-[11px]">
            <Undo2 className="h-3 w-3" /> +{numQty} {unit}
          </span>
        );
      default:
        return (
          <span className="font-mono text-slate-600 dark:text-slate-300">
            {qty} {unit}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/inventory">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Stock Movement Audit Ledger</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-10">
            Immutable transaction history of purchases, adjustments, spoilage wastage, and order recipe consumption.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reasons, references, staff..."
            className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 h-9"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Movement Types</option>
          <option value="PURCHASE">Purchase / Intake</option>
          <option value="CONSUMPTION">Order Consumption</option>
          <option value="WASTAGE">Wastage / Spoilage</option>
          <option value="ADJUSTMENT_IN">Positive Adjustment</option>
          <option value="ADJUSTMENT_OUT">Negative Adjustment</option>
          <option value="OPENING">Opening Stock</option>
          <option value="RETURN">Reversal / Return</option>
        </select>
      </div>

      {/* Audit Movements Table */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Movement Type</th>
                <th className="p-3.5">Delta Applied</th>
                <th className="p-3.5">Balance (Before ➔ After)</th>
                <th className="p-3.5">Reference / Context</th>
                <th className="p-3.5">Reason / Remarks</th>
                <th className="p-3.5">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
              {isLoadingMovements ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading stock movement ledger...
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No stock movements recorded.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m: StockMovement) => (
                  <tr key={m.id} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{m.movement_type_display}</td>
                    <td className="p-3.5">{getMovementBadge(m.movement_type, m.quantity, m.unit)}</td>
                    <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">
                      {m.quantity_before} ➔{" "}
                      <span className="font-bold text-slate-900 dark:text-white">
                        {m.quantity_after} {m.unit}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-indigo-400">
                      {m.reference_id || m.reference_type || "—"}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">{m.reason || "—"}</td>
                    <td className="p-3.5 font-medium text-slate-500 dark:text-slate-400">{m.created_by_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
