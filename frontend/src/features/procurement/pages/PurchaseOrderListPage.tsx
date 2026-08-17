import React, { useState } from "react";
import {
  usePurchaseOrders,
  useSubmitPurchaseOrder,
  useApprovePurchaseOrder,
  useSendPurchaseOrder,
  useCancelPurchaseOrder,
} from "../hooks/useProcurement";
import { POStatusBadge } from "../components/POStatusBadge";
import { CreatePOModal } from "../components/CreatePOModal";
import { ReceiveGoodsModal } from "../components/ReceiveGoodsModal";
import { PurchaseOrder } from "../types/procurement.types";
import {
  ShoppingCart,
  Plus,
  Search,
  Send,
  CheckCircle2,
  PackageCheck,
  Ban,
  Building2,
  Mail,
  Filter,
} from "lucide-react";
import { Link } from "react-router-dom";

export const PurchaseOrderListPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReceivePO, setSelectedReceivePO] = useState<PurchaseOrder | null>(null);

  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
  });

  const submitMutation = useSubmitPurchaseOrder();
  const approveMutation = useApprovePurchaseOrder();
  const sendMutation = useSendPurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();

  const totalPOs = purchaseOrders.length;
  const pendingCount = purchaseOrders.filter((p) => ["SUBMITTED", "PENDING_APPROVAL"].includes(p.status)).length;
  const approvedCount = purchaseOrders.filter((p) => ["APPROVED", "SENT", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"].includes(p.status)).length;
  const receivedCount = purchaseOrders.filter((p) => p.status === "RECEIVED").length;

  const handleSubmitPO = async (id: string) => {
    try {
      await submitMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to submit PO.");
    }
  };

  const handleApprovePO = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to approve PO.");
    }
  };

  const handleSendPO = async (id: string) => {
    try {
      await sendMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to send PO.");
    }
  };

  const handleCancelPO = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this purchase order?")) return;
    try {
      await cancelMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to cancel PO.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Purchase Orders</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supplier purchase orders, approvals, vendor dispatch, and dock intake
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/procurement/suppliers"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-slate-700/60 transition-colors"
          >
            <Building2 className="h-4 w-4 text-indigo-400" />
            Suppliers Catalog
          </Link>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create PO
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <p className="text-xs font-medium text-slate-400">Total POs</p>
          <p className="text-2xl font-black text-white mt-1">{totalPOs}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <p className="text-xs font-medium text-amber-400">Pending Approval</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <p className="text-xs font-medium text-indigo-400">Active / In-Transit</p>
          <p className="text-2xl font-black text-indigo-400 mt-1">{approvedCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
          <p className="text-xs font-medium text-emerald-400">Fully Received</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{receivedCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by PO number or supplier name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500 ml-1" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="SENT">Sent to Vendor</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* PO Master Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading purchase orders...</div>
        ) : purchaseOrders.length > 0 ? (
          <div className="divide-y divide-slate-800/60">
            {purchaseOrders.map((po) => (
              <div key={po.id} className="p-5 hover:bg-slate-800/20 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-indigo-400 text-base">{po.po_number}</span>
                    <POStatusBadge status={po.status} />
                    <span className="text-xs text-slate-400 font-mono">v{po.version}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {po.status === "DRAFT" && (
                      <button
                        onClick={() => handleSubmitPO(po.id)}
                        disabled={submitMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                      >
                        <Send className="w-3.5 h-3.5" /> Submit
                      </button>
                    )}

                    {["DRAFT", "SUBMITTED", "PENDING_APPROVAL"].includes(po.status) && (
                      <button
                        onClick={() => handleApprovePO(po.id)}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}

                    {po.status === "APPROVED" && (
                      <button
                        onClick={() => handleSendPO(po.id)}
                        disabled={sendMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20"
                      >
                        <Mail className="w-3.5 h-3.5" /> Dispatch to Vendor
                      </button>
                    )}

                    {["APPROVED", "SENT", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"].includes(po.status) && (
                      <button
                        onClick={() => setSelectedReceivePO(po)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                      >
                        <PackageCheck className="w-3.5 h-3.5" /> Receive Intake
                      </button>
                    )}

                    {!["RECEIVED", "CANCELLED", "CLOSED"].includes(po.status) && (
                      <button
                        onClick={() => handleCancelPO(po.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Cancel PO"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                  <div className="flex items-center gap-4">
                    <span>
                      Vendor: <strong className="text-white">{po.supplier_name}</strong>
                    </span>
                    <span>Store: <strong className="text-slate-300">{po.location}</strong></span>
                    <span>Order Date: <strong className="text-slate-300">{po.order_date || "-"}</strong></span>
                    <span>Expected: <strong className="text-slate-300">{po.expected_delivery_date || "-"}</strong></span>
                  </div>

                  <div className="font-mono text-sm font-bold text-emerald-400">
                    Total: ${po.total_amount}
                  </div>
                </div>

                {/* Items preview table */}
                <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                        <th className="pb-1.5">Item</th>
                        <th className="pb-1.5">Ordered</th>
                        <th className="pb-1.5">Received</th>
                        <th className="pb-1.5">Remaining</th>
                        <th className="pb-1.5 text-right">Unit Cost</th>
                        <th className="pb-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                      {po.items.map((line) => (
                        <tr key={line.id}>
                          <td className="py-1.5 font-sans font-medium text-white">{line.item_name_snapshot}</td>
                          <td className="py-1.5 text-slate-300">{line.quantity_ordered} {line.unit}</td>
                          <td className="py-1.5 text-emerald-400">{line.quantity_received} {line.unit}</td>
                          <td className="py-1.5 text-amber-400">{line.remaining_quantity} {line.unit}</td>
                          <td className="py-1.5 text-right text-slate-400">${line.unit_cost}</td>
                          <td className="py-1.5 text-right font-bold text-emerald-400">${line.line_total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 text-sm">
            No purchase orders found matching the filter criteria.
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateOpen && <CreatePOModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />}
      {selectedReceivePO && (
        <ReceiveGoodsModal
          purchaseOrder={selectedReceivePO}
          isOpen={Boolean(selectedReceivePO)}
          onClose={() => setSelectedReceivePO(null)}
        />
      )}
    </div>
  );
};
