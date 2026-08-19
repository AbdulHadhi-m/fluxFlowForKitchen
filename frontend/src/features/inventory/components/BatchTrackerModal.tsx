import React from 'react';
import { X, Calendar, PackageCheck } from 'lucide-react';
import { useItemBatches } from '../hooks/useInventory';

interface BatchTrackerModalProps {
  itemId: string;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const BatchTrackerModal: React.FC<BatchTrackerModalProps> = ({
  itemId,
  itemName,
  isOpen,
  onClose,
}) => {
  const { data: batches = [], isLoading } = useItemBatches(itemId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/70 dark:bg-slate-950/40">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
              Batch & FEFO Lot Tracker: {itemName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">First-Expiry First-Out batch allocations</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading batch lots...</div>
          ) : batches.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No active batches registered for this item.
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => {
                const isExpiringSoon =
                  batch.expiry_date &&
                  new Date(batch.expiry_date).getTime() - Date.now() < 3 * 86400000;

                return (
                  <div
                    key={batch.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200">
                          {batch.batch_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            batch.batch_status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : batch.batch_status === 'EXPIRED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {batch.batch_status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>Received: {batch.received_date}</span>
                        {batch.expiry_date && (
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              isExpiringSoon ? 'text-amber-400' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Expiry: {batch.expiry_date}
                          </span>
                        )}
                        {batch.supplier_name && <span>Supplier: {batch.supplier_name}</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-emerald-400 block">
                        {Number(batch.current_quantity).toFixed(3)} {batch.item_unit}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Init: {Number(batch.initial_quantity).toFixed(3)} â€¢ ${Number(batch.unit_cost).toFixed(2)}/u
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
