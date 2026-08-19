import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBillSchema, CreateBillFormValues } from "../schemas/billing.schemas";
import { Order } from "@/features/orders/types/order.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Loader2, Sparkles, X } from "lucide-react";

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  selectedOrderId?: string;
  onSubmit: (values: CreateBillFormValues) => Promise<any>;
  isLoading: boolean;
}

export const CreateBillModal: React.FC<CreateBillModalProps> = ({
  isOpen,
  onClose,
  orders,
  selectedOrderId,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateBillFormValues>({
    resolver: zodResolver(createBillSchema),
    defaultValues: {
      order_id: selectedOrderId || (orders.length > 0 ? orders[0].id : ""),
      discount_type: "NONE",
      discount_value: 0,
      service_charge_rate: 0,
      notes: "",
    },
  });

  React.useEffect(() => {
    if (selectedOrderId) {
      setValue("order_id", selectedOrderId);
    } else if (orders.length > 0) {
      setValue("order_id", orders[0].id);
    }
  }, [selectedOrderId, orders, setValue]);

  if (!isOpen) return null;

  const discountType = watch("discount_type");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Receipt className="h-5 w-5 text-emerald-400" />
            Generate Bill / Invoice
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Order Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 dark:text-slate-300">Target Customer Order</label>
            <select
              {...register("order_id")}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              {orders.length === 0 && <option value="">No eligible active orders</option>}
              {orders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  {ord.order_number} {ord.table_name ? `(Table ${ord.table_name})` : "(Takeaway)"} — ${ord.total}
                </option>
              ))}
            </select>
            {errors.order_id && <p className="text-xs text-rose-400">{errors.order_id.message}</p>}
          </div>

          {/* Discount Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600 dark:text-slate-300">Discount Type</label>
              <select
                {...register("discount_type")}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="NONE">No Discount</option>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>

            {discountType !== "NONE" && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-600 dark:text-slate-300">
                  {discountType === "PERCENTAGE" ? "Discount (%)" : "Discount (₹)"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("discount_value")}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm"
                  placeholder="0.00"
                />
                {errors.discount_value && (
                  <p className="text-xs text-rose-400">{errors.discount_value.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Service Charge */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 dark:text-slate-300">Service Charge (%)</label>
            <Input
              type="number"
              step="0.01"
              {...register("service_charge_rate")}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm"
              placeholder="0.00"
            />
            {errors.service_charge_rate && (
              <p className="text-xs text-rose-400">{errors.service_charge_rate.message}</p>
            )}
          </div>

          {/* Billing Notes */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-600 dark:text-slate-300">Billing Notes / Customer Remarks</label>
            <Input
              {...register("notes")}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm"
              placeholder="e.g. VIP guest, split receipt"
            />
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
              disabled={isLoading || orders.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Bill
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
