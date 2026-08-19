import React, { useState } from 'react';
import { X, ArrowRightLeft, Plus, Trash2 } from 'lucide-react';
import { useInventoryItems, useCreateTransfer } from '../hooks/useInventory';
import { StorageLocation, UnitOfMeasure } from '../types/inventory.types';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTransferModal: React.FC<CreateTransferModalProps> = ({ isOpen, onClose }) => {
  const [sourceLocation, setSourceLocation] = useState<StorageLocation>('MAIN_STORE');
  const [destinationLocation, setDestinationLocation] = useState<StorageLocation>('KITCHEN');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{ item_id: string; quantity: number; unit: UnitOfMeasure; notes: string }>
  >([{ item_id: '', quantity: 1, unit: 'kg', notes: '' }]);

  const { data: inventoryItems = [] } = useInventoryItems();
  const createTransferMutation = useCreateTransfer();

  if (!isOpen) return null;

  const addItemRow = () => {
    setItems((prev) => [...prev, { item_id: '', quantity: 1, unit: 'kg', notes: '' }]);
  };

  const removeItemRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceLocation === destinationLocation) {
      alert('Source and destination locations cannot be identical.');
      return;
    }

    const validItems = items.filter((i) => i.item_id);
    if (validItems.length === 0) {
      alert('Please add at least one item.');
      return;
    }

    try {
      await createTransferMutation.mutateAsync({
        source_location: sourceLocation,
        destination_location: destinationLocation,
        items: validItems,
        notes,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Inter-Location Transfer</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Transfer raw materials between store, kitchen & bar</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                From (Source)
              </label>
              <select
                value={sourceLocation}
                onChange={(e) => setSourceLocation(e.target.value as StorageLocation)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:border-indigo-500"
              >
                <option value="MAIN_STORE">Main Store</option>
                <option value="WALK_IN_FREEZER">Walk-in Freezer</option>
                <option value="DRY_STORAGE">Dry Storage</option>
                <option value="KITCHEN">Kitchen</option>
                <option value="BAR">Bar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                To (Destination)
              </label>
              <select
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value as StorageLocation)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:border-indigo-500"
              >
                <option value="KITCHEN">Kitchen</option>
                <option value="BAR">Bar</option>
                <option value="MAIN_STORE">Main Store</option>
                <option value="WALK_IN_FREEZER">Walk-in Freezer</option>
                <option value="DRY_STORAGE">Dry Storage</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Transfer Items
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={row.item_id}
                    onChange={(e) => updateItem(idx, 'item_id', e.target.value)}
                    required
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs"
                  >
                    <option value="">Select inventory item...</option>
                    {inventoryItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} (Avail: {Number(it.current_quantity).toFixed(2)} {it.unit})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={row.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                    className="w-24 px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono"
                  />

                  <select
                    value={row.unit}
                    onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                    className="w-24 px-2 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">Liters</option>
                    <option value="ml">ml</option>
                    <option value="piece">Piece</option>
                    <option value="pack">Pack</option>
                    <option value="bottle">Bottle</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Transfer Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Daily shift opening kitchen requisition"
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
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
              disabled={createTransferMutation.isPending}
              className="px-5 py-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-400 font-semibold text-sm transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {createTransferMutation.isPending ? 'Requesting...' : 'Request Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
