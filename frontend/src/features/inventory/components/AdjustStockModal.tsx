import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adjustStockSchema, AdjustStockFormValues } from "../schemas/inventory.schemas";
import { InventoryItem } from "../types/inventory.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, Loader2, X } from "lucide-react";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSubmit: (itemId: string, values: AdjustStockFormValues) => Promise<any>;
  isLoading: boolean;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  isOpen,
  onClose,
  item,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      delta_quantity: 0,
      reason: "",
    },
  });

  if (!isOpen || !item) return null;

  const delta = watch("delta_quantity") || 0;
  const current = parseFloat(item.current_quantity);
  const projected = current + delta;

  const handleFormSubmit = async (values: AdjustStockFormValues) => {
    await onSubmit(item.id, values);
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <SlidersHorizontal className="h-5 w-5 text-amber-400" />
            Stock Adjustment — {item.name}
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Stock Banner */}
        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Current Stock:</span>{" "}
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {item.current_quantity} {item.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Projected Balance:</span>{" "}
            <span
              className={`font-mono font-black text-sm ${
                projected < 0 ? "text-rose-400" : "text-amber-400"
              }`}
            >
              {projected.toFixed(3)} {item.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-600 dark:text-slate-300">Adjustment Delta Quantity (+ or -)</label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Use '-' to reduce</span>
            </div>
            <Input
              type="number"
              step="0.001"
              {...register("delta_quantity")}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-mono"
              placeholder="+5.000 or -2.500"
            />
            {errors.delta_quantity && (
              <p className="text-xs text-rose-400">{errors.delta_quantity.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300">Adjustment Reason</label>
            <Input
              {...register("reason")}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm"
              placeholder="e.g. End of month physical inventory reconciliation"
            />
            {errors.reason && <p className="text-xs text-rose-400">{errors.reason.message}</p>}
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
              disabled={isLoading || delta === 0 || projected < 0}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-amber-600/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />}
              Apply Adjustment ({delta > 0 ? `+₹{delta}` : delta} {item.unit})
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
