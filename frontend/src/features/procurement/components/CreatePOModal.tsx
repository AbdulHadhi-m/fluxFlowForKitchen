import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createPurchaseOrderSchema,
  CreatePurchaseOrderFormValues,
} from "../schemas/procurement.schemas";
import { Supplier } from "../types/procurement.types";
import { InventoryItem } from "@/features/inventory/types/inventory.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Trash2, Loader2, X } from "lucide-react";

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  onSubmit: (values: CreatePurchaseOrderFormValues) => Promise<any>;
  isLoading: boolean;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  inventoryItems,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePurchaseOrderFormValues>({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: {
      supplier_id: suppliers.length > 0 ? suppliers[0].id : "",
      tax_amount: 0,
      notes: "",
      items: inventoryItems.length > 0
        ? [{ inventory_item_id: inventoryItems[0].id, quantity_ordered: 10, unit: inventoryItems[0].unit as any, unit_cost: parseFloat(inventoryItems[0].cost_per_unit) || 0 }]
        : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  React.useEffect(() => {
    if (suppliers.length > 0) {
      setValue("supplier_id", suppliers[0].id);
    }
  }, [suppliers, setValue]);

  if (!isOpen) return null;

  const watchedItems = watch("items") || [];
  const tax = watch("tax_amount") || 0;
  const subtotal = watchedItems.reduce((sum, item) => {
    const q = item.quantity_ordered || 0;
    const c = item.unit_cost || 0;
    return sum + q * c;
  }, 0);
  const total = subtotal + tax;

  const handleFormSubmit = async (values: CreatePurchaseOrderFormValues) => {
    await onSubmit(values);
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <ShoppingCart className="h-5 w-5 text-indigo-400" />
            Create Purchase Order Draft
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
          {/* Supplier & Delivery */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Target Supplier / Vendor</label>
              <select
                {...register("supplier_id")}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplier_code})
                  </option>
                ))}
              </select>
              {errors.supplier_id && (
                <p className="text-xs text-rose-400">{errors.supplier_id.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300">Expected Delivery Date</label>
              <Input
                type="date"
                {...register("expected_delivery_date")}
                className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-300">Raw Material Order Items</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (inventoryItems.length > 0) {
                    append({
                      inventory_item_id: inventoryItems[0].id,
                      quantity_ordered: 5,
                      unit: inventoryItems[0].unit as any,
                      unit_cost: parseFloat(inventoryItems[0].cost_per_unit) || 0,
                    });
                  }
                }}
                className="h-7 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 gap-1"
              >
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2 items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex-1">
                    <select
                      {...register(`items.${idx}.inventory_item_id`)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      {inventoryItems.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.current_quantity} {inv.unit} in stock)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Qty"
                      {...register(`items.${idx}.quantity_ordered`)}
                      className="h-8 bg-slate-900 border-slate-700 text-xs font-mono"
                    />
                  </div>

                  <div className="w-20">
                    <select
                      {...register(`items.${idx}.unit`)}
                      className="w-full h-8 bg-slate-900 border border-slate-700 rounded-lg px-1 text-xs text-slate-200"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="piece">pc</option>
                      <option value="pack">pack</option>
                      <option value="bottle">bottle</option>
                      <option value="box">box</option>
                    </select>
                  </div>

                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Cost $"
                      {...register(`items.${idx}.unit_cost`)}
                      className="h-8 bg-slate-900 border-slate-700 text-xs font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400">Est. Subtotal: ${subtotal.toFixed(2)}</span>
            <span className="font-bold text-emerald-400 text-sm">Total: ${total.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || fields.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Save Purchase Order Draft
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
