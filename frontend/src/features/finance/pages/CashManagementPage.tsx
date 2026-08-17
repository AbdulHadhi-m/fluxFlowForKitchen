import React, { useState } from "react";
import { useCashSessions, useApproveCashVariance } from "../hooks/useFinance";
import { OpenCashSessionModal } from "../components/OpenCashSessionModal";
import { CloseCashSessionModal } from "../components/CloseCashSessionModal";
import { CashPayoutModal } from "../components/CashPayoutModal";
import { CashSession } from "../types/finance.types";
import {
  Landmark,
  Plus,
  ArrowUpRight,
  Lock,
  AlertTriangle,
  Clock,
} from "lucide-react";

export const CashManagementPage: React.FC = () => {
  const { data: sessions = [], isLoading } = useCashSessions();
  const approveVarianceMutation = useApproveCashVariance();

  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [closingSession, setClosingSession] = useState<CashSession | null>(null);
  const [payoutSessionId, setPayoutSessionId] = useState<string | null>(null);

  const handleApproveVariance = async (id: string) => {
    const notes = prompt("Manager variance approval notes:");
    if (notes) {
      try {
        await approveVarianceMutation.mutateAsync({ id, approval_notes: notes });
      } catch (err: any) {
        alert(err?.response?.data?.error?.message || "Failed to approve variance.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Landmark className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Cash Drawer Sessions & Payouts</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Register drawer floats, petty cash payouts, shift changeover, and cash reconciliation
          </p>
        </div>

        <button
          onClick={() => setIsOpenModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Open Cash Drawer
        </button>
      </div>

      {/* Cash Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-sm">
            Loading cash drawer sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
            No active cash drawer sessions. Click "Open Cash Drawer" to start a cashier shift.
          </div>
        ) : (
          sessions.map((s) => {
            const isOpen = s.status === "OPEN";
            const variance = parseFloat(s.variance || "0.00");
            const hasVariance = Math.abs(variance) > 0.01;

            return (
              <div
                key={s.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white text-base">{s.register_name}</h3>
                      <p className="text-xs text-slate-400">Opened by <strong className="text-slate-300">{s.opened_by_name || "Cashier"}</strong></p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isOpen
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : s.status === "RECONCILIATION_REQUIRED"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {isOpen ? "Active Session" : s.status === "RECONCILIATION_REQUIRED" ? "Variance Review" : "Shift Closed"}
                    </span>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Opening Float:</span>
                      <strong className="font-mono text-white">${parseFloat(s.opening_balance).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Cash Sales:</span>
                      <strong className="font-mono text-emerald-400">+${parseFloat(s.cash_sales).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Cash Payouts:</span>
                      <strong className="font-mono text-rose-400">-${parseFloat(s.cash_payouts).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1.5 text-slate-300 font-semibold">
                      <span>Expected Drawer Balance:</span>
                      <strong className="font-mono text-white">${parseFloat(s.expected_cash).toFixed(2)}</strong>
                    </div>
                    {!isOpen && s.counted_cash && (
                      <div className="flex justify-between border-t border-slate-800 pt-1.5 text-slate-300 font-semibold">
                        <span>Actual Counted:</span>
                        <strong className="font-mono text-white">${parseFloat(s.counted_cash).toFixed(2)}</strong>
                      </div>
                    )}
                  </div>

                  {!isOpen && hasVariance && (
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                      variance < 0 ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Variance: <strong className="font-mono">${variance.toFixed(2)}</strong></span>
                      </div>
                      {s.status === "RECONCILIATION_REQUIRED" && (
                        <button
                          onClick={() => handleApproveVariance(s.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {isOpen ? (
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => setPayoutSessionId(s.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                      Cash Payout
                    </button>
                    <button
                      onClick={() => setClosingSession(s)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Close Shift
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Closed: {new Date(s.closed_at || "").toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isOpenModalOpen && <OpenCashSessionModal isOpen={isOpenModalOpen} onClose={() => setIsOpenModalOpen(false)} />}
      {closingSession && (
        <CloseCashSessionModal
          session={closingSession}
          isOpen={Boolean(closingSession)}
          onClose={() => setClosingSession(null)}
        />
      )}
      {payoutSessionId && (
        <CashPayoutModal
          sessionId={payoutSessionId}
          isOpen={Boolean(payoutSessionId)}
          onClose={() => setPayoutSessionId(null)}
        />
      )}
    </div>
  );
};
