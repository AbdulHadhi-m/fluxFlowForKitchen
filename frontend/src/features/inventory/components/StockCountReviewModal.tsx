import React, { useState } from 'react';
import { X, CheckCircle, Send } from 'lucide-react';
import { StockCount } from '../types/inventory.types';
import {
  useUpdateStockCountItems,
  useSubmitStockCount,
  useApproveStockCount,
} from '../hooks/useInventory';

interface StockCountReviewModalProps {
  stockCount: StockCount | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StockCountReviewModal: React.FC<StockCountReviewModalProps> = ({
  stockCount,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !stockCount) return null;

  const [items, setItems] = useState<
    Array<{ item_id: string; counted_quantity: number; notes: string }>
  >(
    stockCount.items.map((i) => ({
      item_id: i.item,
      counted_quantity: Number(i.counted_quantity),
      notes: i.notes || '',
    }))
  );

  const updateItemsMutation = useUpdateStockCountItems();
  const submitCountMutation = useSubmitStockCount();
  const approveCountMutation = useApproveStockCount();

  const handleQuantityChange = (itemId: string, qty: number) => {
    setItems((prev) =>
      prev.map((it) => (it.item_id === itemId ? { ...it, counted_quantity: qty } : it))
    );
  };

  const handleNotesChange = (itemId: string, note: string) => {
    setItems((prev) =>
      prev.map((it) => (it.item_id === itemId ? { ...it, notes: note } : it))
    );
  };

  const handleSaveProgress = async () => {
    await updateItemsMutation.mutateAsync({ countId: stockCount.id, items });
  };

  const handleSubmitReview = async () => {
    await updateItemsMutation.mutateAsync({ countId: stockCount.id, items });
    await submitCountMutation.mutateAsync(stockCount.id);
    onClose();
  };

  const handleApproveAndReconcile = async () => {
    await approveCountMutation.mutateAsync(stockCount.id);
    onClose();
  };

  const isEditable = stockCount.status === 'DRAFT' || stockCount.status === 'IN_PROGRESS';
  const isSubmittable = stockCount.status === 'SUBMITTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-semibold text-emerald-400">
                {stockCount.count_number}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {stockCount.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Location: {stockCount.location} • Category: {stockCount.category}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">System Qty</th>
                  <th className="py-3 px-4">Physical Count</th>
                  <th className="py-3 px-4">Variance Qty</th>
                  <th className="py-3 px-4">Variance Value</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {stockCount.items.map((ci) => {
                  const currentInput = items.find((x) => x.item_id === ci.item);
                  const counted = currentInput ? currentInput.counted_quantity : Number(ci.counted_quantity);
                  const sys = Number(ci.system_quantity);
                  const varianceQty = counted - sys;
                  const varianceVal = varianceQty * Number(ci.unit_cost || 0);

                  return (
                    <tr key={ci.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-200">
                        {ci.item_name}
                        <span className="text-slate-500 block text-[10px]">{ci.item_unit}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {Number(ci.system_quantity).toFixed(3)} {ci.item_unit}
                      </td>
                      <td className="py-3 px-4">
                        {isEditable ? (
                          <input
                            type="number"
                            step="0.001"
                            value={counted}
                            onChange={(e) => handleQuantityChange(ci.item, Number(e.target.value))}
                            className="w-24 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:border-emerald-500"
                          />
                        ) : (
                          <span className="font-mono text-slate-200">
                            {Number(ci.counted_quantity).toFixed(3)} {ci.item_unit}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={
                            varianceQty < 0
                              ? 'text-rose-400'
                              : varianceQty > 0
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }
                        >
                          {varianceQty > 0 ? `+${varianceQty.toFixed(3)}` : varianceQty.toFixed(3)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span
                          className={
                            varianceVal < 0
                              ? 'text-rose-400 font-semibold'
                              : varianceVal > 0
                              ? 'text-emerald-400 font-semibold'
                              : 'text-slate-400'
                          }
                        >
                          ${varianceVal.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isEditable ? (
                          <input
                            type="text"
                            value={currentInput?.notes || ''}
                            onChange={(e) => handleNotesChange(ci.item, e.target.value)}
                            placeholder="e.g. Broken packaging"
                            className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-300 text-xs"
                          />
                        ) : (
                          <span className="text-slate-400">{ci.notes || '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm font-semibold transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            {isEditable && (
              <>
                <button
                  type="button"
                  onClick={handleSaveProgress}
                  disabled={updateItemsMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm font-semibold transition-colors"
                >
                  Save Progress
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submitCountMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" />
                  Submit for Approval
                </button>
              </>
            )}

            {isSubmittable && (
              <button
                type="button"
                onClick={handleApproveAndReconcile}
                disabled={approveCountMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle className="w-4 h-4" />
                Approve & Post Adjustments
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
