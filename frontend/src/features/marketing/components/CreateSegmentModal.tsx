import React from "react";
import { useForm } from "react-hook-form";
import { X, Users, CheckCircle2 } from "lucide-react";
import { CustomerSegment } from "../types/marketing.types";
import { useCreateSegment } from "../hooks/useMarketing";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateSegmentModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const createMut = useCreateSegment();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Partial<CustomerSegment>>({
    defaultValues: {
      name: "",
      description: "",
      segment_type: "CUSTOM",
      min_spend: "0.00",
      min_visits: 0,
      inactive_days: 0,
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (values: Partial<CustomerSegment>) => {
    await createMut.mutateAsync({
      ...values,
      min_spend: String(values.min_spend || "0.00"),
      min_visits: Number(values.min_visits || 0),
      inactive_days: Number(values.inactive_days || 0),
    });
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Create Audience Segment</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Segment Name *</label>
            <input
              type="text"
              placeholder="e.g. VIP Spenders ($200+)"
              {...register("name", { required: "Segment name is required" })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            {errors.name && <p className="text-rose-400 text-[10px] mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Describe criteria or marketing purpose..."
              {...register("description")}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Segment Template Type</label>
            <select
              {...register("segment_type")}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="CUSTOM">Custom Rule Criteria</option>
              <option value="ALL_CUSTOMERS">All Active Customers</option>
              <option value="NEW_CUSTOMERS">New Diners (1-2 visits)</option>
              <option value="REGULAR_CUSTOMERS">Regulars (3+ visits)</option>
              <option value="VIP_CUSTOMERS">VIP High Frequency (10+ visits or $500+)</option>
              <option value="INACTIVE_CUSTOMERS">Inactive Diners (60+ days without visit)</option>
              <option value="HIGH_VALUE_CUSTOMERS">High Spenders ($300+)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Min Spend ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("min_spend")}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Min Visits</label>
              <input
                type="number"
                min="0"
                {...register("min_visits")}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Inactive (Days)</label>
              <input
                type="number"
                min="0"
                {...register("inactive_days")}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Save Segment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
