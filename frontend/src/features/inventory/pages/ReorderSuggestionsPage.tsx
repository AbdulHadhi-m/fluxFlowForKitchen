import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useReorderSuggestions } from '../hooks/useInventory';
import { StockStatusBadge } from '../components/StockStatusBadge';

export const ReorderSuggestionsPage: React.FC = () => {
  const { data: suggestions = [], isLoading } = useReorderSuggestions();

  const totalEstCost = suggestions.reduce(
    (sum, s) => sum + Number(s.estimated_purchase_cost || 0),
    0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7 text-amber-400" />
            Par Level Replenishment & Reorder Suggestions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated deficit calculation based on par levels, min stock & pending inbound purchase orders
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
          <span className="text-slate-500 dark:text-slate-400 block">Total Est. Purchase Requisition</span>
          <span className="text-lg font-bold font-mono text-amber-400">
            ${totalEstCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Suggestions Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Item & SKU</th>
                <th className="py-3.5 px-4 font-semibold">Stock Status</th>
                <th className="py-3.5 px-4 font-semibold">Current Stock</th>
                <th className="py-3.5 px-4 font-semibold">Inbound (Pending PO)</th>
                <th className="py-3.5 px-4 font-semibold">Par Level</th>
                <th className="py-3.5 px-4 font-semibold">Suggested Order Qty</th>
                <th className="py-3.5 px-4 font-semibold text-right">Est. Reorder Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Calculating replenishment deficits...
                  </td>
                </tr>
              ) : suggestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    All items are adequately stocked above par levels. No replenishment needed.
                  </td>
                </tr>
              ) : (
                suggestions.map((s) => (
                  <tr key={s.item_id} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{s.item_name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{s.sku || 'NO-SKU'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StockStatusBadge status={s.stock_status} />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-200">
                      {Number(s.current_quantity).toFixed(2)} {s.unit}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-indigo-400">
                      {Number(s.pending_inbound_quantity).toFixed(2)} {s.unit}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {Number(s.par_level).toFixed(2)} {s.unit}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400 text-sm">
                      {Number(s.suggested_reorder_quantity).toFixed(2)} {s.unit}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-right">
                      ${Number(s.estimated_purchase_cost).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
