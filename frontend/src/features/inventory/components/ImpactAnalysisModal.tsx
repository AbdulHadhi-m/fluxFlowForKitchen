import React, { useState } from 'react';
import { X, TrendingUp, ArrowRight } from 'lucide-react';
import { inventoryApi } from '../api/inventory.api';

interface ImpactAnalysisModalProps {
  itemId: string;
  itemName: string;
  currentCost: string;
  unit: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImpactAnalysisModal: React.FC<ImpactAnalysisModalProps> = ({
  itemId,
  itemName,
  currentCost,
  unit,
  isOpen,
  onClose,
}) => {
  const [newCost, setNewCost] = useState(Number(currentCost) * 1.15); // +15% default simulation
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.analyzeCostImpact(itemId, newCost);
      setAnalysis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/70 dark:bg-slate-950/40">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              Cost Change Simulation: {itemName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Current Cost: ${Number(currentCost).toFixed(2)} / {unit}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Simulated New Cost per {unit} (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newCost}
                onChange={(e) => setNewCost(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono focus:border-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSimulate}
              disabled={loading}
              className="mt-5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold text-sm transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>

          {analysis && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Impacted Menu Dishes</span>
                <span className="font-bold text-amber-400 text-base">
                  {analysis.impacted_dishes_count} Dishes Affected
                </span>
              </div>

              <div className="space-y-2">
                {analysis.impacted_items?.map((item: any) => (
                  <div
                    key={item.recipe_id}
                    className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 block text-sm">
                        {item.menu_item_name || item.recipe_name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Selling Price: ${item.selling_price}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end font-mono">
                        <span className="text-slate-500 dark:text-slate-400">₹{item.old_recipe_cost}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-rose-400 font-bold">
                          ${item.new_estimated_recipe_cost}
                        </span>
                      </div>
                      <span className="text-[10px] text-rose-400/80 block mt-0.5">
                        Margin Delta: -₹{item.cost_delta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
