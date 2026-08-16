import React, { useState } from "react";
import { useInventory } from "../hooks/useInventory";
import { StockStatusBadge } from "../components/StockStatusBadge";
import { CreateInventoryItemModal } from "../components/CreateInventoryItemModal";
import { ReceiveStockModal } from "../components/ReceiveStockModal";
import { AdjustStockModal } from "../components/AdjustStockModal";
import { WastageModal } from "../components/WastageModal";
import { InventoryItem } from "../types/inventory.types";
import { Can } from "@/features/authorization/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Boxes,
  PackagePlus,
  ArrowDownLeft,
  SlidersHorizontal,
  Trash2,
  Search,
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

export const InventoryListPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedReceiveItem, setSelectedReceiveItem] = useState<InventoryItem | null>(null);
  const [selectedAdjustItem, setSelectedAdjustItem] = useState<InventoryItem | null>(null);
  const [selectedWasteItem, setSelectedWasteItem] = useState<InventoryItem | null>(null);

  const {
    items,
    isLoadingItems,
    createItem,
    isCreatingItem,
    receiveStock,
    isReceivingStock,
    adjustStock,
    isAdjustingStock,
    recordWastage,
    isRecordingWastage,
  } = useInventory(searchQuery, lowStockOnly);

  const totalItems = items.length;
  const lowStockCount = items.filter((i) => i.stock_status === "LOW_STOCK").length;
  const outOfStockCount = items.filter((i) => i.stock_status === "OUT_OF_STOCK").length;
  const inStockCount = items.filter((i) => i.stock_status === "IN_STOCK").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Boxes className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Inventory & Raw Material Stock</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track ingredients, low-stock reorder thresholds, intake receipts, adjustments, and order recipe deductions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/inventory/movements">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs gap-1.5"
            >
              <History className="h-3.5 w-3.5 text-indigo-400" /> Stock Audit Ledger
            </Button>
          </Link>

          <Can permission="inventory.update">
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <PackagePlus className="h-3.5 w-3.5" /> Add Inventory Item
            </Button>
          </Can>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-slate-900/60 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Total Items</p>
              <p className="text-xl font-black text-white mt-0.5">{totalItems}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Boxes className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">In Stock</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">{inStockCount}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Low Stock Alert</p>
              <p className="text-xl font-black text-amber-400 mt-0.5">{lowStockCount}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Out of Stock</p>
              <p className="text-xl font-black text-rose-400 mt-0.5">{outOfStockCount}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients or SKU..."
            className="pl-9 bg-slate-950 border-slate-800 text-xs text-slate-200 h-9"
          />
        </div>

        <button
          type="button"
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            lowStockOnly
              ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Low Stock Only ({lowStockCount + outOfStockCount})
        </button>
      </div>

      {/* Inventory Items Table */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">Item Name & SKU</th>
                <th className="p-3.5">Unit</th>
                <th className="p-3.5">Current Stock</th>
                <th className="p-3.5">Min Alert Level</th>
                <th className="p-3.5">Cost / Unit</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Quick Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoadingItems ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No inventory items found. Add ingredients using the button above.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white text-sm">{item.name}</div>
                      {item.sku && (
                        <div className="font-mono text-[10px] text-slate-500">{item.sku}</div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono uppercase text-slate-400">{item.unit}</td>
                    <td className="p-3.5 font-mono font-bold text-white text-sm">
                      {item.current_quantity}{" "}
                      <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {item.minimum_stock_level} {item.unit}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">${item.cost_per_unit}</td>
                    <td className="p-3.5">
                      <StockStatusBadge status={item.stock_status} />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Can permission="inventory.update">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReceiveItem(item)}
                            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-7 text-[11px] px-2 gap-1 font-semibold"
                          >
                            <ArrowDownLeft className="h-3 w-3" /> Receive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAdjustItem(item)}
                            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7 text-[11px] px-2 gap-1 font-semibold"
                          >
                            <SlidersHorizontal className="h-3 w-3" /> Adjust
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedWasteItem(item)}
                            className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-7 text-[11px] px-2 gap-1 font-semibold"
                          >
                            <Trash2 className="h-3 w-3" /> Waste
                          </Button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      <CreateInventoryItemModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (values) => {
          await createItem(values);
          setIsCreateOpen(false);
        }}
        isLoading={isCreatingItem}
      />

      <ReceiveStockModal
        isOpen={!!selectedReceiveItem}
        onClose={() => setSelectedReceiveItem(null)}
        item={selectedReceiveItem}
        onSubmit={async (id, values) => {
          await receiveStock({ id, payload: values });
          setSelectedReceiveItem(null);
        }}
        isLoading={isReceivingStock}
      />

      <AdjustStockModal
        isOpen={!!selectedAdjustItem}
        onClose={() => setSelectedAdjustItem(null)}
        item={selectedAdjustItem}
        onSubmit={async (id, values) => {
          await adjustStock({ id, payload: values });
          setSelectedAdjustItem(null);
        }}
        isLoading={isAdjustingStock}
      />

      <WastageModal
        isOpen={!!selectedWasteItem}
        onClose={() => setSelectedWasteItem(null)}
        item={selectedWasteItem}
        onSubmit={async (id, values) => {
          await recordWastage({ id, payload: values });
          setSelectedWasteItem(null);
        }}
        isLoading={isRecordingWastage}
      />
    </div>
  );
};
