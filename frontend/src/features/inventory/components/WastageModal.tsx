import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { wastageSchema, WastageFormValues } from "../schemas/inventory.schemas";
import { InventoryItem } from "../types/inventory.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2, X } from "lucide-react";

interface WastageModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSubmit: (itemId: string, values: WastageFormValues) => Promise<any>;
  isLoading: boolean;
}

export const WastageModal: React.FC<WastageModalProps> = ({
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
  } = useForm<WastageFormValues>({
    resolver: zodResolver(wastageSchema),
    defaultValues: {
      quantity: 1,
      reason: "Spoiled / Expired",
    },
  });

  if (!isOpen || !item) return null;

  const wastedQty = watch("quantity") || 0;
  const current = parseFloat(item.current_quantity);
  const remaining = current - wastedQty;

  const handleFormSubmit = async (values: WastageFormValues) => {
    await onSubmit(item.id, values);
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Trash2 className="h-5 w-5 text-rose-400" />
            Record Wastage — {item.name}
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Stock Banner */}
        <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Available Stock:</span>{" "}
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {item.current_quantity} {item.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Remaining Balance:</span>{" "}
            <span
              className={`font-mono font-black text-sm ${
                remaining < 0 ? "text-rose-500 font-bold" : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {remaining.toFixed(3)} {item.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300">Wasted Quantity ({item.unit})</label>
            <Input
              type="number"
              step="0.001"
              max={current}
              {...register("quantity")}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-mono"
            />
            {errors.quantity && <p className="text-xs text-rose-400">{errors.quantity.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300">Wastage / Spoilage Reason</label>
            <select
              {...register("reason")}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="Spoiled / Expired">Spoiled / Expired</option>
              <option value="Preparation Loss / Burnt">Preparation Loss / Burnt</option>
              <option value="Dropped / Container Damage">Dropped / Container Damage</option>
              <option value="Quality Inspection Rejection">Quality Inspection Rejection</option>
              <option value="Other">Other</option>
            </select>
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
              disabled={isLoading || wastedQty <= 0 || remaining < 0}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-rose-600/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Deduct Wastage (-{wastedQty} {item.unit})
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
