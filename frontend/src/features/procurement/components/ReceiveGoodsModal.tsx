import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { receiveGoodsSchema, ReceiveGoodsFormValues } from "../schemas/procurement.schemas";
import { PurchaseOrder } from "../types/procurement.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Loader2, X } from "lucide-react";

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  onSubmit: (poId: string, values: ReceiveGoodsFormValues) => Promise<any>;
  isLoading: boolean;
}

export const ReceiveGoodsModal: React.FC<ReceiveGoodsModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
  } = useForm<ReceiveGoodsFormValues>({
    resolver: zodResolver(receiveGoodsSchema),
    defaultValues: {
      notes: "Delivery batch intake",
      items: [],
    },
  });

  React.useEffect(() => {
    if (purchaseOrder) {
      const itemsList = purchaseOrder.items.map((item) => ({
        purchase_order_item_id: item.id,
        quantity: parseFloat(item.remaining_quantity) || 0,
      }));
      setValue("items", itemsList);
    }
  }, [purchaseOrder, setValue]);

  if (!isOpen || !purchaseOrder) return null;

  const handleFormSubmit = async (values: ReceiveGoodsFormValues) => {
    await onSubmit(purchaseOrder.id, values);
    reset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Truck className="h-5 w-5 text-emerald-400" />
            Receive Delivery — {purchaseOrder.po_number}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-1">
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {purchaseOrder.items.map((poItem, idx) => (
              <div key={poItem.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">{poItem.item_name_snapshot}</span>
                  <span className="font-mono text-slate-400">
                    Remaining: <b className="text-amber-400">{poItem.remaining_quantity} {poItem.unit}</b> (of {poItem.quantity_ordered})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-400 whitespace-nowrap">Receive Qty ({poItem.unit}):</label>
                  <Input
                    type="number"
                    step="0.001"
                    max={parseFloat(poItem.remaining_quantity)}
                    {...register(`items.${idx}.quantity`)}
                    className="h-8 bg-slate-900 border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Intake Notes / Inspection Remarks</label>
            <Input
              {...register("notes")}
              className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
              placeholder="e.g. Temperature checked 4°C, all boxes sealed"
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
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              Confirm Stock Receipt
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
