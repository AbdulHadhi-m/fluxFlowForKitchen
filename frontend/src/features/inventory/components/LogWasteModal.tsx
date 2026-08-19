import React, { useState } from 'react';
import { X, AlertOctagon } from 'lucide-react';
import { useInventoryItems, useCreateWasteRecord } from '../hooks/useInventory';
import { WasteReason, StorageLocation } from '../types/inventory.types';

interface LogWasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultItemId?: string;
}

export const LogWasteModal: React.FC<LogWasteModalProps> = ({
  isOpen,
  onClose,
  defaultItemId = '',
}) => {
  const [itemId, setItemId] = useState(defaultItemId);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<WasteReason>('SPOILAGE');
  const [location, setLocation] = useState<StorageLocation>('KITCHEN');
  const [notes, setNotes] = useState('');

  const { data: items = [] } = useInventoryItems();
  const createWasteMutation = useCreateWasteRecord();

  if (!isOpen) return null;

  const selectedItem = items.find((i) => i.id === itemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;

    try {
      await createWasteMutation.mutateAsync({
        item_id: itemId,
        quantity,
        reason,
        location,
        notes,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Log Wastage & Spoilage</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Track shrinkage and cost loss</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Inventory Item *
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:border-rose-500"
            >
              <option value="">Select item...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({Number(i.current_quantity).toFixed(2)} {i.unit} available)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Wasted Quantity *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-mono focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as StorageLocation)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:border-rose-500"
              >
                <option value="KITCHEN">Kitchen</option>
                <option value="BAR">Bar</option>
                <option value="MAIN_STORE">Main Store</option>
                <option value="WALK_IN_FREEZER">Walk-in Freezer</option>
                <option value="DRY_STORAGE">Dry Storage</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Waste Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as WasteReason)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:border-rose-500"
            >
              <option value="SPOILAGE">Expired / Spoiled</option>
              <option value="PREPARATION_WASTE">Prep Trimming / Peeling Waste</option>
              <option value="DAMAGED">Damaged / Dropped</option>
              <option value="SPILLAGE">Spillage</option>
              <option value="OVER_PORTIONING">Over-portioning</option>
              <option value="BURNT_OVERCOOKED">Burnt / Overcooked</option>
              <option value="CUSTOMER_RETURN">Customer Return / Complaint</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {selectedItem && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-300 flex justify-between">
              <span>Estimated Cost Loss:</span>
              <span className="font-bold">
                ${(quantity * Number(selectedItem.weighted_average_cost || selectedItem.cost_per_unit || 0)).toFixed(2)}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Notes & Root Cause
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fridge temperature fluctuation during power outage"
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:border-rose-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createWasteMutation.isPending}
              className="px-5 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-400 font-semibold text-sm transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50"
            >
              {createWasteMutation.isPending ? 'Logging...' : 'Log Wastage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
