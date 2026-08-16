import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { receiveStockSchema, ReceiveStockFormValues } from "../schemas/inventory.schemas";
import { InventoryItem } from "../types/inventory.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownLeft, Loader2, X } from "lucide-react";

interface ReceiveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSubmit: (itemId: string, values: ReceiveStockFormValues) => Promise<any>;
  isLoading: boolean;
}

export const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
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
  } = useForm<ReceiveStockFormValues>({
    resolver: zodResolver(receiveStockSchema),
    defaultValues: {
      quantity: 1,
      unit: item ? item.unit : "kg",
      reference: "",
      reason: "Supplier intake delivery",
    },
  });

  if (!isOpen || !item) return null;

  const inputQty = watch("quantity") || 0;
  const newQtyEstimate = parseFloat(item.current_quantity) + inputQty;

  const handleFormSubmit = async (values: ReceiveStockFormValues) => {
    await onSubmit(item.id, values);
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
            Receive Stock — {item.name}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Stock Banner */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-400">Current Stock:</span>{" "}
            <span className="font-mono font-bold text-white">
              {item.current_quantity} {item.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Projected:</span>{" "}
            <span className="font-mono font-black text-emerald-400 text-sm">
              {newQtyEstimate.toFixed(3)} {item.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3.5 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Quantity Received</label>
              <Input
                type="number"
                step="0.001"
                {...register("quantity")}
                className="bg-slate-950 border-slate-800 text-slate-200 text-sm font-mono"
              />
              {errors.quantity && <p className="text-xs text-rose-400">{errors.quantity.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300">Unit</label>
              <select
                {...register("unit")}
                defaultValue={item.unit}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="piece">piece</option>
                <option value="pack">pack</option>
                <option value="bottle">bottle</option>
                <option value="box">box</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Supplier Invoice / PO Reference</label>
            <Input
              {...register("reference")}
              className="bg-slate-950 border-slate-800 text-slate-200 text-sm font-mono"
              placeholder="e.g. INV-9921 or PO-4482"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Intake Reason / Remarks</label>
            <Input
              {...register("reason")}
              className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
              placeholder="e.g. Weekly vegetable delivery batch"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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
              disabled={isLoading || inputQty <= 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownLeft className="h-4 w-4" />}
              Receive Stock (+{inputQty} {item.unit})
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
