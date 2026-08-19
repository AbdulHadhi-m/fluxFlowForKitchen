import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createInventoryItemSchema,
  CreateInventoryItemFormValues,
} from "../schemas/inventory.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackagePlus, Loader2, X } from "lucide-react";

interface CreateInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateInventoryItemFormValues) => Promise<any>;
  isLoading: boolean;
}

export const CreateInventoryItemModal: React.FC<CreateInventoryItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateInventoryItemFormValues>({
    resolver: zodResolver(createInventoryItemSchema),
    defaultValues: {
      name: "",
      sku: "",
      unit: "kg",
      minimum_stock_level: 5,
      cost_per_unit: 0,
      initial_quantity: 0,
    },
  });

  if (!isOpen) return null;

  const handleFormSubmit = async (values: CreateInventoryItemFormValues) => {
    await onSubmit(values);
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <PackagePlus className="h-5 w-5 text-emerald-400" />
            Add Inventory Item
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300">Item / Ingredient Name</label>
            <Input
              {...register("name")}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm"
              placeholder="e.g. Fresh Chicken Breast, Basmati Rice"
            />
            {errors.name && <p className="text-xs text-rose-400">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300">SKU / Item Code</label>
              <Input
                {...register("sku")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-mono"
                placeholder="ING-1002"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300">Unit of Measure</label>
              <select
                {...register("unit")}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="l">Liter (l)</option>
                <option value="ml">Milliliter (ml)</option>
                <option value="piece">Piece (pc)</option>
                <option value="pack">Pack</option>
                <option value="bottle">Bottle</option>
                <option value="box">Box</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300">Initial Stock</label>
              <Input
                type="number"
                step="0.001"
                {...register("initial_quantity")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300">Min. Alert Level</label>
              <Input
                type="number"
                step="0.001"
                {...register("minimum_stock_level")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300">Cost / Unit (₹)</label>
              <Input
                type="number"
                step="0.01"
                {...register("cost_per_unit")}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
              Create Item
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
