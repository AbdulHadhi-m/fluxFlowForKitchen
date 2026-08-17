import React from "react";
import { useForm } from "react-hook-form";
import { X, Send, CheckCircle2 } from "lucide-react";
import { Campaign, CustomerSegment, Promotion } from "../types/marketing.types";
import { useCreateCampaign } from "../hooks/useMarketing";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  segments: CustomerSegment[];
  promotions: Promotion[];
}

export const CreateCampaignModal: React.FC<Props> = ({ isOpen, onClose, segments, promotions }) => {
  const createMut = useCreateCampaign();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Partial<Campaign>>({
    defaultValues: {
      name: "",
      channel: "IN_APP",
      title: "Exclusive Dinner Special",
      message_template: "Hello {customer_name}! Claim your special discount on our chef specialties.",
      start_at: new Date().toISOString().slice(0, 16),
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (values: Partial<Campaign>) => {
    await createMut.mutateAsync({
      ...values,
      start_at: values.start_at ? new Date(values.start_at).toISOString() : new Date().toISOString(),
      target_segment: values.target_segment || null,
      promotion: values.promotion || null,
    });
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Send className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Create Marketing Campaign</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Campaign Name *</label>
            <input
              type="text"
              placeholder="e.g. Weekend VIP Tasting Push"
              {...register("name", { required: "Name is required" })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            {errors.name && <p className="text-rose-400 text-[10px] mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Channel *</label>
              <select
                {...register("channel")}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="IN_APP">In-App Notification</option>
                <option value="EMAIL">Email Broadcast</option>
                <option value="SMS">SMS Message</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Segment</label>
              <select
                {...register("target_segment")}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Opted-In Diners</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Attached Promotion</label>
              <select
                {...register("promotion")}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">None (General announcement)</option>
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Schedule Date/Time</label>
              <input
                type="datetime-local"
                {...register("start_at")}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notification Title *</label>
            <input
              type="text"
              placeholder="e.g. 🍷 Enjoy complimentary dessert this weekend"
              {...register("title", { required: true })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Message Template *</label>
            <textarea
              rows={3}
              placeholder="Hi {customer_name}, visit us and use code {promo_name}..."
              {...register("message_template", { required: true })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Supported tokens: <code>{"{customer_name}"}</code>, <code>{"{promo_name}"}</code>
            </p>
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
              <span>Create Campaign</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
