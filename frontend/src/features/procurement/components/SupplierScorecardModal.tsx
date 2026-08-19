import React from "react";
import { useSupplierScorecard } from "../hooks/useProcurement";
import { X, Award, AlertTriangle, TrendingUp, Clock, PackageCheck, RotateCcw } from "lucide-react";

interface SupplierScorecardModalProps {
  supplierId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SupplierScorecardModal: React.FC<SupplierScorecardModalProps> = ({
  supplierId,
  isOpen,
  onClose,
}) => {
  const { data: scorecard, isLoading } = useSupplierScorecard(supplierId);

  if (!isOpen) return null;

  const fillRate = scorecard ? parseFloat(scorecard.fill_rate_percentage) : 100;
  const isHealthy = fillRate >= 95;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Supplier Performance Scorecard</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Quality, fulfillment, and reliability metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-3" />
              Calculating vendor scorecard...
            </div>
          ) : scorecard ? (
            <>
              {/* Supplier Header Summary */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-200/70 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700/50">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base">{scorecard.supplier_name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Terms: {scorecard.payment_terms}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isHealthy ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {isHealthy ? <TrendingUp className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {isHealthy ? "Preferred Tier" : "Needs Review"}
                </div>
              </div>

              {/* Fill Rate Highlight */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Fulfillment Fill Rate</span>
                  <span className="text-2xl font-black text-emerald-400">{scorecard.fill_rate_percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      fillRate >= 95 ? "bg-emerald-500" : fillRate >= 80 ? "bg-amber-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(fillRate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Metric Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-200/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                    <PackageCheck className="w-4 h-4 text-cyan-400" />
                    Delivered Quantity
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{scorecard.total_delivered_quantity}</p>
                  <p className="text-xs text-slate-500">Accepted: {scorecard.total_accepted_quantity}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-200/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    Rejected & Returns
                  </div>
                  <p className="text-lg font-bold text-rose-400">{scorecard.total_rejected_quantity}</p>
                  <p className="text-xs text-slate-500">{scorecard.returns_count} Return incidents logged</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-200/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Lead Time
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{scorecard.standard_lead_time_days} Days</p>
                  <p className="text-xs text-slate-500">Standard lead SLA</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-200/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Orders Completed
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{scorecard.completed_orders} / {scorecard.total_orders}</p>
                  <p className="text-xs text-slate-500">Lifetime purchase orders</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">No performance records found.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
};
