import React, { useState } from 'react';
import {
  Plus,
  Search,
  Package,
  RefreshCw,
  Box,
  TrendingUp,
} from 'lucide-react';
import {
  useInventoryItems,
  useInventoryValuation,
  useVarianceAnalysis,
  useCreateInventoryItem,
  useReceiveStock,
  useAdjustStock,
} from '../hooks/useInventory';
import { FoodCostKPICards } from '../components/FoodCostKPICards';
import { StockStatusBadge } from '../components/StockStatusBadge';
import { CreateInventoryItemModal } from '../components/CreateInventoryItemModal';
import { ReceiveStockModal } from '../components/ReceiveStockModal';
import { AdjustStockModal } from '../components/AdjustStockModal';
import { LogWasteModal } from '../components/LogWasteModal';
import { BatchTrackerModal } from '../components/BatchTrackerModal';
import { ImpactAnalysisModal } from '../components/ImpactAnalysisModal';
import { InventoryItem } from '../types/inventory.types';

export const InventoryListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receiveItem, setReceiveItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [wasteItem, setWasteItem] = useState<InventoryItem | null>(null);
  const [batchItem, setBatchItem] = useState<InventoryItem | null>(null);
  const [impactItem, setImpactItem] = useState<InventoryItem | null>(null);

  const { data: items = [], isLoading, refetch } = useInventoryItems({
    item_type: typeFilter !== 'ALL' ? typeFilter : undefined,
    storage_location: locationFilter !== 'ALL' ? locationFilter : undefined,
    search: searchTerm || undefined,
  });

  const createItemMutation = useCreateInventoryItem();
  const receiveStockMutation = useReceiveStock();
  const adjustStockMutation = useAdjustStock();

  const { data: valuation } = useInventoryValuation();
  const { data: variance } = useVarianceAnalysis();

  const lowStockCount = items.filter((i) => i.stock_status === 'LOW_STOCK').length;
  const outOfStockCount = items.filter((i) => i.stock_status === 'OUT_OF_STOCK').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-400" />
            Inventory & Food Costing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Master ingredient catalog, real-time stock levels, valuations & recipes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            title="Refresh Stock Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Master Item
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <FoodCostKPICards
        valuation={valuation}
        variance={variance}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
      />

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ingredient name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Item Types</option>
            <option value="RAW_INGREDIENT">Raw Ingredients</option>
            <option value="PACKAGING">Packaging</option>
            <option value="CONSUMABLE">Consumables</option>
            <option value="SEMI_FINISHED">Semi-finished / Preps</option>
            <option value="FINISHED_GOOD">Finished Goods</option>
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Storage Locations</option>
            <option value="MAIN_STORE">Main Store</option>
            <option value="KITCHEN">Kitchen Line</option>
            <option value="BAR">Bar Station</option>
            <option value="WALK_IN_FREEZER">Walk-in Freezer</option>
            <option value="DRY_STORAGE">Dry Storage</option>
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Item & SKU</th>
                <th className="py-3.5 px-4 font-semibold">Type / Location</th>
                <th className="py-3.5 px-4 font-semibold">Current Stock</th>
                <th className="py-3.5 px-4 font-semibold">Par Level</th>
                <th className="py-3.5 px-4 font-semibold">Avg Cost</th>
                <th className="py-3.5 px-4 font-semibold">Total Value</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No inventory items found matching filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const qty = Number(item.current_quantity);
                  const cost = Number(item.weighted_average_cost || item.cost_per_unit || 0);
                  const valuationVal = qty * cost;

                  return (
                    <tr key={item.id} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{item.name}</div>
                        <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                          {item.sku || 'NO-SKU'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-600 dark:text-slate-300 block">{item.item_type.replace('_', ' ')}</span>
                        <span className="text-slate-500 text-[10px] block">
                          {item.storage_location.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-700 dark:text-slate-200 text-sm font-bold">
                          {qty.toFixed(3)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{item.unit}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {Number(item.par_level || 0).toFixed(1)} {item.unit}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        ${cost.toFixed(2)}
                        <span className="text-slate-500 text-[10px] block">/{item.unit}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                        ${valuationVal.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <StockStatusBadge status={item.stock_status} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setReceiveItem(item)}
                            className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
                            title="Receive Stock Intake"
                          >
                            + Intake
                          </button>

                          <button
                            onClick={() => setAdjustItem(item)}
                            className="px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs transition-colors"
                            title="Adjust Stock Balance"
                          >
                            Adjust
                          </button>

                          <button
                            onClick={() => setWasteItem(item)}
                            className="px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs transition-colors"
                            title="Log Waste"
                          >
                            Waste
                          </button>

                          {(item.track_batch || item.track_expiry) && (
                            <button
                              onClick={() => setBatchItem(item)}
                              className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-semibold transition-colors"
                              title="View Batches / Expiry"
                            >
                              <Box className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setImpactItem(item)}
                            className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors"
                            title="Cost Change Impact Simulation"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isCreateOpen && (
        <CreateInventoryItemModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={async (values) => {
            await createItemMutation.mutateAsync(values);
            setIsCreateOpen(false);
          }}
          isLoading={createItemMutation.isPending}
        />
      )}

      {receiveItem && (
        <ReceiveStockModal
          item={receiveItem}
          isOpen={!!receiveItem}
          onClose={() => setReceiveItem(null)}
          onSubmit={async (values) => {
            await receiveStockMutation.mutateAsync({ itemId: receiveItem.id, payload: values });
            setReceiveItem(null);
          }}
          isLoading={receiveStockMutation.isPending}
        />
      )}

      {adjustItem && (
        <AdjustStockModal
          item={adjustItem}
          isOpen={!!adjustItem}
          onClose={() => setAdjustItem(null)}
          onSubmit={async (values) => {
            await adjustStockMutation.mutateAsync({ itemId: adjustItem.id, payload: values });
            setAdjustItem(null);
          }}
          isLoading={adjustStockMutation.isPending}
        />
      )}

      {wasteItem && (
        <LogWasteModal
          isOpen={!!wasteItem}
          onClose={() => setWasteItem(null)}
          defaultItemId={wasteItem.id}
        />
      )}

      {batchItem && (
        <BatchTrackerModal
          itemId={batchItem.id}
          itemName={batchItem.name}
          isOpen={!!batchItem}
          onClose={() => setBatchItem(null)}
        />
      )}

      {impactItem && (
        <ImpactAnalysisModal
          itemId={impactItem.id}
          itemName={impactItem.name}
          currentCost={impactItem.weighted_average_cost || impactItem.cost_per_unit || '0'}
          unit={impactItem.unit}
          isOpen={!!impactItem}
          onClose={() => setImpactItem(null)}
        />
      )}
    </div>
  );
};
