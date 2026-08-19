import React, { useState } from "react";
import { usePurchaseRecommendations } from "../hooks/useProcurement";
import { Sparkles, Plus, Building2, Package, Clock } from "lucide-react";
import { CreatePOModal } from "../components/CreatePOModal";

export const PurchasePlanningPage: React.FC = () => {
  const { data: recommendations, isLoading } = usePurchaseRecommendations();
  const [selectedItemForPo, setSelectedItemForPo] = useState<any>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-indigo-400" />
            Automated Purchase Planning
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Intelligent replenishment recommendations factoring in stock deficits, lead times, MOQ, and pack size roundups
          </p>
        </div>
      </div>

      {/* Recommendations Board */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">Calculating inventory replenishment suggestions...</div>
        ) : recommendations && recommendations.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {recommendations.map((rec) => (
              <div
                key={rec.inventory_item_id}
                className="p-5 hover:bg-slate-200/70 dark:hover:bg-slate-800/20 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{rec.item_name}</h3>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">({rec.sku})</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {rec.recommendation_reason}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-cyan-400" />
                      On-Hand: <strong className="text-slate-900 dark:text-white ml-1">{rec.current_stock} {rec.unit}</strong>
                    </span>
                    <span>Par Level: <strong className="text-slate-700 dark:text-slate-200">{rec.par_level} {rec.unit}</strong></span>
                    {parseFloat(rec.inbound_quantity) > 0 && (
                      <span>Inbound POs: <strong className="text-amber-400">{rec.inbound_quantity} {rec.unit}</strong></span>
                    )}
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      Preferred Vendor: <strong className="text-slate-700 dark:text-slate-200 ml-1">{rec.preferred_supplier_name}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Lead Time: <strong className="text-slate-700 dark:text-slate-200 ml-1">{rec.lead_time_days} days</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end lg:self-center">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Suggested Order</p>
                    <p className="text-lg font-black font-mono text-indigo-400">
                      {rec.suggested_quantity} {rec.unit}
                    </p>
                    <p className="text-xs font-mono font-semibold text-emerald-400">
                      Est. Total: ${rec.estimated_total_cost}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedItemForPo(rec)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create PO
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 text-sm">
            All stock levels are optimal. No reorder recommendations at this time.
          </div>
        )}
      </div>

      {/* Create PO from Recommendation */}
      {selectedItemForPo && (
        <CreatePOModal
          isOpen={Boolean(selectedItemForPo)}
          onClose={() => setSelectedItemForPo(null)}
          prefillItem={{
            supplier_id: selectedItemForPo.preferred_supplier_id,
            inventory_item_id: selectedItemForPo.inventory_item_id,
            quantity: selectedItemForPo.suggested_quantity,
            unit_cost: selectedItemForPo.unit_cost,
          }}
        />
      )}
    </div>
  );
};
