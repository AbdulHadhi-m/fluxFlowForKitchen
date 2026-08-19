import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LoyaltyAccount } from "../types/loyalty.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, PlusCircle, X } from "lucide-react";

const adjustSchema = z.object({
  points_delta: z.coerce.number().refine((val) => val !== 0, "Adjustment cannot be zero"),
  reason: z.string().min(3, "Mandatory reason required"),
});

type AdjustFormData = z.infer<typeof adjustSchema>;

interface AdjustPointsModalProps {
  isOpen: boolean;
  account?: LoyaltyAccount | null;
  onClose: () => void;
  onSubmit: (accountId: string, pointsDelta: number, reason: string) => Promise<any>;
  isLoading?: boolean;
}

export const AdjustPointsModal: React.FC<AdjustPointsModalProps> = ({
  isOpen,
  account,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustFormData>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      points_delta: 50,
      reason: "",
    },
  });

  if (!isOpen || !account) return null;

  const handleFormSubmit = async (data: AdjustFormData) => {
    await onSubmit(account.id, data.points_delta, data.reason);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-900 dark:text-slate-100 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Adjust Loyalty Points</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Member: {account.customer_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Points Adjustment (+ to add, - to deduct) *
            </label>
            <Input
              type="number"
              {...register("points_delta")}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
            />
            {errors.points_delta && (
              <span className="text-[10px] text-rose-400">{errors.points_delta.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mandatory Reason / Audit Note *</label>
            <Input
              {...register("reason")}
              placeholder="e.g. VIP goodwill bonus, service recovery"
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
            />
            {errors.reason && (
              <span className="text-[10px] text-rose-400">{errors.reason.message}</span>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Confirm Adjustment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
