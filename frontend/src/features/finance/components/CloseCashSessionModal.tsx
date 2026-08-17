import React, { useState } from "react";
import { useCloseCashSession } from "../hooks/useFinance";
import { CashSession } from "../types/finance.types";
import { DollarSign, X, AlertTriangle } from "lucide-react";

interface CloseCashSessionModalProps {
  session: CashSession;
  isOpen: boolean;
  onClose: () => void;
}

export const CloseCashSessionModal: React.FC<CloseCashSessionModalProps> = ({ session, isOpen, onClose }) => {
  const closeSessionMutation = useCloseCashSession();
  const [countedCash, setCountedCash] = useState(session.expected_cash);
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const expected = parseFloat(session.expected_cash) || 0;
  const counted = parseFloat(countedCash) || 0;
  const variance = counted - expected;
  const hasVariance = Math.abs(variance) > 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await closeSessionMutation.mutateAsync({
        id: session.id,
        data: {
          counted_cash: countedCash,
          notes: notes.trim(),
        },
      });
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to close cash drawer.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Close & Reconcile Drawer</h2>
              <p className="text-xs text-slate-400">{session.register_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Opening Float:</span>
              <strong className="text-white font-mono">${parseFloat(session.opening_balance).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cash Sales:</span>
              <strong className="text-emerald-400 font-mono">+${parseFloat(session.cash_sales).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cash Payouts:</span>
              <strong className="text-rose-400 font-mono">-${parseFloat(session.cash_payouts).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2 text-slate-300 font-semibold">
              <span>Expected Cash in Drawer:</span>
              <strong className="text-white font-mono text-sm">${expected.toFixed(2)}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Actual Counted Cash ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 text-lg font-bold"
              required
            />
          </div>

          {hasVariance && (
            <div className={`p-3 rounded-lg border flex items-center gap-2.5 text-xs ${
              variance < 0 ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {variance < 0 ? `Cash Shortage of $${Math.abs(variance).toFixed(2)}` : `Cash Overage of $${variance.toFixed(2)}`}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Closing Shift Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for any count differences..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={closeSessionMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {closeSessionMutation.isPending ? "Reconciling..." : "Submit & Close Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
