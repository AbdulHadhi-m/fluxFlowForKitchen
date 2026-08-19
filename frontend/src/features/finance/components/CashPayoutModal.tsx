import React, { useState } from "react";
import { usePayoutCashSession } from "../hooks/useFinance";
import { ArrowUpRight, X } from "lucide-react";

interface CashPayoutModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CashPayoutModal: React.FC<CashPayoutModalProps> = ({ sessionId, isOpen, onClose }) => {
  const payoutMutation = usePayoutCashSession();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("Operational Supplies");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid payout amount.");
      return;
    }
    if (!reason.trim()) {
      alert("Please provide a reason for the cash payout.");
      return;
    }

    try {
      await payoutMutation.mutateAsync({
        id: sessionId,
        data: {
          amount,
          reason: reason.trim(),
          category,
        },
      });
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to record cash payout.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Record Cash Payout</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Petty cash disbursement from drawer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Payout Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Expense Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
            >
              <option value="Emergency Kitchen Supplies">Emergency Kitchen Supplies</option>
              <option value="Delivery / Fuel Expense">Delivery / Fuel Expense</option>
              <option value="Staff Meal / Gratuity">Staff Meal / Gratuity</option>
              <option value="Cleaning & Maintenance">Cleaning & Maintenance</option>
              <option value="Vendor COD Cash Settlement">Vendor COD Cash Settlement</option>
              <option value="Other Petty Cash">Other Petty Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Reason / Receipt Narration
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Bought emergency lemons and cilantro from nearby market"
              className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={payoutMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              {payoutMutation.isPending ? "Recording..." : "Disburse Cash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
