import React, { useState } from "react";
import { useCreatePurchaseReturn, useSuppliers } from "../hooks/useProcurement";
import { useInventoryItems } from "@/features/inventory/hooks/useInventory";
import { X, RotateCcw, Plus, Trash2 } from "lucide-react";
import { ReturnReason } from "../types/procurement.types";

interface CreateReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateReturnModal: React.FC<CreateReturnModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: suppliers } = useSuppliers({ is_active: true });
  const { data: inventoryItems } = useInventoryItems();
  const createReturnMutation = useCreatePurchaseReturn();

  const [supplierId, setSupplierId] = useState("");
  const [reason, setReason] = useState<ReturnReason>("DAMAGED");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    Array<{ inventory_item_id: string; quantity: string; unit_cost: string; notes: string }>
  >([{ inventory_item_id: "", quantity: "1.000", unit_cost: "0.00", notes: "" }]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { inventory_item_id: "", quantity: "1.000", unit_cost: "0.00", notes: "" }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, val: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: val };
        if (field === "inventory_item_id") {
          const matched = inventoryItems?.find((inv) => inv.id === val);
          if (matched) {
            updated.unit_cost = matched.cost_per_unit || "0.00";
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert("Please select a vendor.");
      return;
    }
    if (!items.length || items.some((i) => !i.inventory_item_id)) {
      alert("Please select inventory items for all return lines.");
      return;
    }

    try {
      await createReturnMutation.mutateAsync({
        supplier_id: supplierId,
        reason,
        notes,
        items,
      });
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to create return.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Purchase Return</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Return goods to vendor and generate credit note</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Vendor / Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                required
              >
                <option value="">Select vendor...</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplier_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Return Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReturnReason)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              >
                <option value="DAMAGED">Damaged / Broken Packaging</option>
                <option value="EXPIRED">Expired / Short Shelf Life</option>
                <option value="WRONG_ITEM">Wrong Item Delivered</option>
                <option value="QUALITY_ISSUE">Substandard Quality</option>
                <option value="OVER_DELIVERY">Excess / Over-Delivery</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Returned Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex-1">
                    <select
                      value={row.inventory_item_id}
                      onChange={(e) => handleItemChange(idx, "inventory_item_id", e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                      required
                    >
                      <option value="">Select inventory item...</option>
                      {inventoryItems?.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.sku}) - {inv.current_quantity} {inv.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={row.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      placeholder="Qty"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-mono"
                      required
                    />
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.unit_cost}
                      onChange={(e) => handleItemChange(idx, "unit_cost", e.target.value)}
                      placeholder="Unit $"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-mono"
                      required
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Return Dispatch Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Returned with driver on same day delivery"
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createReturnMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              {createReturnMutation.isPending ? "Creating..." : "Submit Return Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
