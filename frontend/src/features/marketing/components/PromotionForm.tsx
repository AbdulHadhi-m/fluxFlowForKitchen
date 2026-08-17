import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Tag,
  Calendar,
  Percent,
  Users,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { Promotion } from "../types/marketing.types";
import { useCreatePromotion, useUpdatePromotion, useSegments } from "../hooks/useMarketing";

interface Props {
  initialData?: Promotion;
  isEdit?: boolean;
}

export const PromotionForm: React.FC<Props> = ({ initialData, isEdit }) => {
  const navigate = useNavigate();
  const createMut = useCreatePromotion();
  const updateMut = useUpdatePromotion();
  const { data: segments } = useSegments();

  const [sampleSubtotal, setSampleSubtotal] = useState<number>(50);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Partial<Promotion>>({
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      promotion_type: initialData?.promotion_type || "PERCENTAGE_DISCOUNT",
      discount_value: initialData?.discount_value || "10.00",
      status: initialData?.status || "ACTIVE",
      start_at: initialData?.start_at ? initialData.start_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
      end_at: initialData?.end_at ? initialData.end_at.slice(0, 16) : "",
      priority: initialData?.priority ?? 10,
      stackable: initialData?.stackable ?? false,
      coupon_required: initialData?.coupon_required ?? false,
      min_order_value: initialData?.min_order_value || "0.00",
      max_discount_amount: initialData?.max_discount_amount || "",
      total_usage_limit: initialData?.total_usage_limit ?? undefined,
      per_customer_limit: initialData?.per_customer_limit ?? 1,
      daily_usage_limit: initialData?.daily_usage_limit ?? undefined,
      target_audience_type: initialData?.target_audience_type || "ALL",
      target_segment: initialData?.target_segment || "",
    },
  });

  const watchedType = watch("promotion_type");
  const watchedValue = Number(watch("discount_value") || 0);
  const watchedMinOrder = Number(watch("min_order_value") || 0);
  const watchedMaxCap = watch("max_discount_amount") ? Number(watch("max_discount_amount")) : null;

  // Real-time Preview Calculation
  const isEligibleForSample = sampleSubtotal >= watchedMinOrder;
  let estimatedDiscount = 0;
  if (isEligibleForSample) {
    if (watchedType === "PERCENTAGE_DISCOUNT") {
      const raw = (sampleSubtotal * watchedValue) / 100;
      estimatedDiscount = watchedMaxCap ? Math.min(raw, watchedMaxCap) : raw;
    } else if (watchedType === "FIXED_DISCOUNT") {
      estimatedDiscount = Math.min(sampleSubtotal, watchedValue);
    }
  }
  const estimatedNet = Math.max(0, sampleSubtotal - estimatedDiscount);

  const onSubmit = async (values: Partial<Promotion>) => {
    const payload = {
      ...values,
      discount_value: String(values.discount_value),
      min_order_value: String(values.min_order_value || "0.00"),
      max_discount_amount: values.max_discount_amount ? String(values.max_discount_amount) : null,
      total_usage_limit: values.total_usage_limit ? Number(values.total_usage_limit) : null,
      per_customer_limit: Number(values.per_customer_limit || 1),
      daily_usage_limit: values.daily_usage_limit ? Number(values.daily_usage_limit) : null,
      priority: Number(values.priority || 10),
      end_at: values.end_at ? new Date(values.end_at).toISOString() : null,
      start_at: values.start_at ? new Date(values.start_at).toISOString() : new Date().toISOString(),
      target_segment: values.target_segment || null,
    };

    if (isEdit && initialData) {
      await updateMut.mutateAsync({ id: initialData.id, payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    navigate("/marketing/promotions");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Tag className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Promotion Identity</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Promotion Name *</label>
              <input
                type="text"
                placeholder="e.g. 20% Happy Hour Dinner Deal"
                {...register("name", { required: "Name is required" })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {errors.name && <p className="text-rose-400 text-[10px] mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
              <textarea
                rows={2}
                placeholder="Explain the promotional deal or terms..."
                {...register("description")}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Discount Logic */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Percent className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Discount Rule Engine</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Promotion Type *</label>
                <select
                  {...register("promotion_type")}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="PERCENTAGE_DISCOUNT">Percentage Discount (%)</option>
                  <option value="FIXED_DISCOUNT">Fixed Currency Amount ($)</option>
                  <option value="BUY_X_GET_Y">Buy X Get Y</option>
                  <option value="FREE_ITEM">Complimentary Item</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {watchedType === "PERCENTAGE_DISCOUNT" ? "Discount Percentage (%) *" : "Discount Amount ($) *"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("discount_value", { required: "Discount value required" })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Minimum Order Spend ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00 (no min)"
                  {...register("min_order_value")}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Maximum Discount Cap ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Optional ceiling limit"
                  {...register("max_discount_amount")}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Audience & Targeting */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Users className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Target Audience</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Audience Type</label>
                <select
                  {...register("target_audience_type")}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Customers</option>
                  <option value="FIRST_ORDER">First-Time Diners Only</option>
                  <option value="RETURNING">Returning Guests (1+ visits)</option>
                  <option value="INACTIVE_CUSTOMERS">Inactive / At-Risk Diners</option>
                  <option value="CUSTOMER_SEGMENT">Specific Segment</option>
                </select>
              </div>

              {watch("target_audience_type") === "CUSTOMER_SEGMENT" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Segment</label>
                  <select
                    {...register("target_segment")}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Choose segment...</option>
                    {segments?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.audience_count ?? 0} guests)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Schedule & Limits */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Schedule & Usage Limits</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  {...register("start_at", { required: "Start date is required" })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">End Date & Time</label>
                <input
                  type="datetime-local"
                  {...register("end_at")}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Total Redemptions Limit</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  {...register("total_usage_limit")}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Limit Per Customer</label>
                <input
                  type="number"
                  min="1"
                  defaultValue="1"
                  {...register("per_customer_limit")}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <input
                  type="checkbox"
                  {...register("coupon_required")}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                Requires Coupon Code at Checkout
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <input
                  type="checkbox"
                  {...register("stackable")}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                />
                Allow Stacking with Other Discounts
              </label>
            </div>
          </div>
        </div>

        {/* Live Simulator & Preview Column */}
        <div className="space-y-6">
          <div className="sticky top-20 p-5 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-slate-900/80 border border-indigo-500/20 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-indigo-500/20">
              <Eye className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Live Rule Simulator</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Test Order Subtotal (${sampleSubtotal})
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={sampleSubtotal}
                  onChange={(e) => setSampleSubtotal(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Order Subtotal:</span>
                  <span className="font-mono text-white">${sampleSubtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Promo Discount:</span>
                  <span className="font-mono">-${estimatedDiscount.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between text-white font-black text-sm">
                  <span>Customer Pays:</span>
                  <span className="font-mono text-indigo-300">${estimatedNet.toFixed(2)}</span>
                </div>
              </div>

              {!isEligibleForSample && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                  <span>⚠️ Subtotal is below minimum spend (${watchedMinOrder}).</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-indigo-500/20 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isEdit ? "Update Promotion" : "Save & Publish Promotion"}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/marketing/promotions")}
                className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
