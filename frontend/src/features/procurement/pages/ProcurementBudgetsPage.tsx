import React, { useState } from "react";
import { useProcurementBudgets } from "../hooks/useProcurement";
import { DollarSign, Plus, AlertTriangle, ShieldCheck } from "lucide-react";
import { CreateBudgetModal } from "../components/CreateBudgetModal";

export const ProcurementBudgetsPage: React.FC = () => {
  const { data: budgets, isLoading } = useProcurementBudgets();
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            Procurement Budgets & Limits
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Department purchasing limits, real-time committed spend, and threshold alerts
          </p>
        </div>

        <button
          onClick={() => setIsBudgetModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Budget Cap
        </button>
      </div>

      {/* Budgets Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">Loading procurement budgets...</div>
      ) : budgets && budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((b) => {
            const pct = parseFloat(b.utilization_percentage || "0");
            const isWarning = pct >= 90;

            return (
              <div
                key={b.id}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{b.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {b.department} • {b.location}
                    </p>
                  </div>
                  <div
                    className={`p-2 rounded-xl border ${
                      isWarning
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {isWarning ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Committed Spend</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ${b.committed_amount} / <span className="text-slate-500 dark:text-slate-400">${b.allocated_amount}</span>
                    </span>
                  </div>

                  <div className="w-full bg-white dark:bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 90 ? "bg-rose-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 font-mono">
                      Remaining: <strong className="text-emerald-400">${b.remaining_budget}</strong>
                    </span>
                    <span className={`font-bold font-mono ${isWarning ? "text-rose-400" : "text-slate-600 dark:text-slate-300"}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {b.start_date} → {b.end_date}
                  </span>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase text-[10px]">{b.period_type}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-slate-500 text-sm bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
          No procurement budgets defined. Click "Create Budget Cap" to set purchasing limits.
        </div>
      )}

      {/* Modal */}
      {isBudgetModalOpen && (
        <CreateBudgetModal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} />
      )}
    </div>
  );
};
