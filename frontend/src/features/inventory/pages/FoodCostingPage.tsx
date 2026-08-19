import React from 'react';
import { IndianRupee, TrendingDown, PieChart, Layers } from 'lucide-react';
import { useVarianceAnalysis, useInventoryValuation } from '../hooks/useInventory';

export const FoodCostingPage: React.FC = () => {
  const { data: variance, isLoading: isVarianceLoading } = useVarianceAnalysis();
  const { data: valuation } = useInventoryValuation();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <IndianRupee className="w-7 h-7 text-emerald-400" />
          Food Costing & Variance Analysis
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Theoretical recipe BOM consumption vs Actual ledger consumption, shrinkage variance & valuation
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Theoretical Food Cost (Sales)
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 font-mono">
            ${Number(variance?.total_theoretical_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Expected ingredient usage from completed orders</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Actual Ledger Consumption
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2 font-mono">
            ${Number(variance?.total_actual_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Deducted stock movements + wastage + spoilage</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Net Variance Cost (Shrinkage)
          </span>
          <div className={`text-2xl font-bold mt-2 font-mono ${Number(variance?.net_variance_cost || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            ${Number(variance?.net_variance_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Unaccounted portioning loss / spoilage gap</p>
        </div>
      </div>

      {/* Variance Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-rose-400" />
          Ingredient-Level Variance Breakdown
        </h2>

        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Ingredient</th>
                  <th className="py-3.5 px-4 font-semibold">Theoretical (Sales)</th>
                  <th className="py-3.5 px-4 font-semibold">Actual Used</th>
                  <th className="py-3.5 px-4 font-semibold">Variance Qty</th>
                  <th className="py-3.5 px-4 font-semibold">Unit Cost</th>
                  <th className="py-3.5 px-4 font-semibold">Variance Cost Loss</th>
                  <th className="py-3.5 px-4 font-semibold">Root Cause Attribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                {isVarianceLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      Computing theoretical vs actual variances...
                    </td>
                  </tr>
                ) : !variance?.items || variance.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No variance data recorded for this reporting period.
                    </td>
                  </tr>
                ) : (
                  variance.items.map((row) => {
                    const varQty = Number(row.variance_quantity);
                    const varCost = Number(row.variance_cost);

                    return (
                      <tr key={row.item_id} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-200">
                          {row.item_name}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {Number(row.theoretical_quantity).toFixed(3)} {row.unit}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {Number(row.actual_quantity).toFixed(3)} {row.unit}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span className={varQty > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            {varQty > 0 ? `+₹{varQty.toFixed(3)}` : varQty.toFixed(3)} {row.unit}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                          ${Number(row.unit_cost).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span className={varCost > 0 ? 'text-rose-400' : 'text-slate-500 dark:text-slate-400'}>
                            ${varCost.toFixed(2)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            varQty > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {row.possible_causes}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Asset Valuation Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* By Location */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Inventory Asset Valuation by Storage Location
          </h3>

          <div className="space-y-2">
            {Object.entries(valuation?.by_location || {}).map(([loc, val]) => (
              <div
                key={loc}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 text-xs"
              >
                <span className="font-semibold text-slate-600 dark:text-slate-300">{loc.replace('_', ' ')}</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* By Item Type */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            Inventory Asset Valuation by Item Classification
          </h3>

          <div className="space-y-2">
            {Object.entries(valuation?.by_type || {}).map(([itype, val]) => (
              <div
                key={itype}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 text-xs"
              >
                <span className="font-semibold text-slate-600 dark:text-slate-300">{itype.replace('_', ' ')}</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
