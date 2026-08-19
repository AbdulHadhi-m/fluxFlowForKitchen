import React from "react";
import { useForm } from "react-hook-form";
import { X, Gift, CheckCircle2 } from "lucide-react";
import { Coupon, Promotion } from "../types/marketing.types";
import { useCreateCoupon } from "../hooks/useMarketing";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  promotions: Promotion[];
}

export const CreateCouponModal: React.FC<Props> = ({ isOpen, onClose, promotions }) => {
  const createMut = useCreateCoupon();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Partial<Coupon>>({
    defaultValues: {
      code: "",
      per_customer_limit: 1,
      valid_from: new Date().toISOString().slice(0, 10),
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (values: Partial<Coupon>) => {
    await createMut.mutateAsync({
      ...values,
      code: values.code?.toUpperCase().trim(),
      usage_limit: values.usage_limit ? Number(values.usage_limit) : null,
      per_customer_limit: Number(values.per_customer_limit || 1),
    });
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Gift className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Custom Coupon Code</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Target Promotion *</label>
            <select
              {...register("promotion", { required: "Please select a promotion" })}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select promotion...</option>
              {promotions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.promotion_type.replace(/_/g, " ")})
                </option>
              ))}
            </select>
            {errors.promotion && <p className="text-rose-400 text-[10px] mt-1">{errors.promotion.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Coupon Code *</label>
            <input
              type="text"
              placeholder="e.g. VIPDINER20"
              {...register("code", { required: "Coupon code is required" })}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white uppercase font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
            {errors.code && <p className="text-rose-400 text-[10px] mt-1">{errors.code.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Total Usage Limit</label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited"
                {...register("usage_limit")}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Per Customer Limit</label>
              <input
                type="number"
                min="1"
                defaultValue="1"
                {...register("per_customer_limit")}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Valid From</label>
              <input
                type="date"
                {...register("valid_from")}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Valid Until</label>
              <input
                type="date"
                {...register("valid_until")}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Create Coupon</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
