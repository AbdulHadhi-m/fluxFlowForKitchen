import React, { useState } from "react";
import {
  useProcurementReports,
  usePurchaseRecommendations,
  useProcurementBudgets,
  usePurchaseOrders,
} from "../hooks/useProcurement";
import {
  ShoppingCart,
  Clock,
  DollarSign,
  AlertCircle,
  Truck,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { POStatusBadge } from "../components/POStatusBadge";
import { CreatePOModal } from "../components/CreatePOModal";
import { CreateRequisitionModal } from "../components/CreateRequisitionModal";

export const ProcurementDashboardPage: React.FC = () => {
  const { data: reports, isLoading: reportsLoading } = useProcurementReports();
  const { data: recommendations, isLoading: recsLoading } = usePurchaseRecommendations();
  const { data: budgets } = useProcurementBudgets();
  const { data: recentOrders } = usePurchaseOrders();

  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);

  const pendingApprovalsCount =
    reports?.po_status_distribution.find((s) => s.status === "PENDING_APPROVAL" || s.status === "SUBMITTED")?.count || 0;

  const totalOpenPos =
    reports?.po_status_distribution
      .filter((s) => ["DRAFT", "SUBMITTED", "PENDING_APPROVAL", "APPROVED", "SENT", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"].includes(s.status))
      .reduce((sum, s) => sum + s.count, 0) || 0;

  const totalMonthSpend =
    reports?.supplier_spend.reduce((sum, s) => sum + parseFloat(s.total_spend || "0"), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7 text-indigo-400" />
            Procurement & Purchasing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supplier management, purchase orders, 3-way matching, and automated reordering
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRequisitionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700/60 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            New Requisition
          </button>
          <button
            onClick={() => setIsPoModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Open POs</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{reportsLoading ? "..." : totalOpenPos}</p>
          <p className="text-xs text-slate-500">Active pipeline orders</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Approvals</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-400">{reportsLoading ? "..." : pendingApprovalsCount}</p>
          <p className="text-xs text-slate-500">Awaiting manager review</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overdue Deliveries</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-400">{reportsLoading ? "..." : reports?.overdue_pos_count || 0}</p>
          <p className="text-xs text-slate-500">Past expected delivery date</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Committed Spend</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">${reportsLoading ? "..." : totalMonthSpend.toFixed(2)}</p>
          <p className="text-xs text-slate-500">Across all vendors this period</p>
        </div>
      </div>

      {/* Main Grid: Reorder Suggestions & Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Automated Purchase Recommendations */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Automated Reorder Suggestions</h2>
            </div>
            <Link
              to="/procurement/planning"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Full Planning <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recsLoading ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">Loading reorder suggestions...</div>
            ) : recommendations && recommendations.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Item & SKU</th>
                    <th className="pb-3 font-semibold">On-Hand</th>
                    <th className="pb-3 font-semibold">Suggested Qty</th>
                    <th className="pb-3 font-semibold">Preferred Vendor</th>
                    <th className="pb-3 font-semibold">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {recommendations.slice(0, 5).map((rec) => (
                    <tr key={rec.inventory_item_id} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30">
                      <td className="py-3">
                        <span className="font-semibold text-slate-900 dark:text-white">{rec.item_name}</span>
                        <span className="block text-[10px] text-slate-500">{rec.sku}</span>
                      </td>
                      <td className="py-3 font-mono text-slate-600 dark:text-slate-300">
                        {rec.current_stock} {rec.unit}
                      </td>
                      <td className="py-3 font-mono font-bold text-indigo-400">
                        {rec.suggested_quantity} {rec.unit}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{rec.preferred_supplier_name}</td>
                      <td className="py-3 font-mono font-semibold text-emerald-400">
                        ${rec.estimated_total_cost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                All inventory items are currently above par levels. No replenishment required!
              </div>
            )}
          </div>
        </div>

        {/* Budget Utilization Widget */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Budgets & Limits</h2>
            </div>
            <Link
              to="/procurement/budgets"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {budgets && budgets.length > 0 ? (
              budgets.slice(0, 3).map((b) => {
                const pct = parseFloat(b.utilization_percentage || "0");
                return (
                  <div key={b.id} className="p-3.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">{b.name}</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        ${b.committed_amount} / ${b.allocated_amount}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 90 ? "bg-rose-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{b.period_type}</span>
                      <span>{pct.toFixed(1)}% Utilized</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No active procurement budgets set.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent POs */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Purchase Orders</h2>
          <Link
            to="/procurement/purchase-orders"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            All Orders <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">PO Number</th>
                <th className="pb-3 font-semibold">Vendor</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Order Date</th>
                <th className="pb-3 font-semibold">Expected</th>
                <th className="pb-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {recentOrders?.slice(0, 5).map((po) => (
                <tr key={po.id} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30">
                  <td className="py-3 font-mono font-bold text-indigo-400">{po.po_number}</td>
                  <td className="py-3 text-slate-900 dark:text-white font-medium">{po.supplier_name}</td>
                  <td className="py-3">
                    <POStatusBadge status={po.status} />
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400">{po.order_date || "-"}</td>
                  <td className="py-3 text-slate-500 dark:text-slate-400">{po.expected_delivery_date || "-"}</td>
                  <td className="py-3 font-mono font-bold text-emerald-400">${po.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isPoModalOpen && <CreatePOModal isOpen={isPoModalOpen} onClose={() => setIsPoModalOpen(false)} />}
      {isRequisitionModalOpen && (
        <CreateRequisitionModal isOpen={isRequisitionModalOpen} onClose={() => setIsRequisitionModalOpen(false)} />
      )}
    </div>
  );
};
