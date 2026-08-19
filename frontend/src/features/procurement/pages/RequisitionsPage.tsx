import React, { useState } from "react";
import {
  useRequisitions,
  useSubmitRequisition,
  useApproveRequisition,
} from "../hooks/useProcurement";
import {
  ClipboardList,
  Plus,
  CheckCircle,
  Send,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  RequisitionStatusBadge,
  RequisitionPriorityBadge,
} from "../components/RequisitionStatusBadge";
import { CreateRequisitionModal } from "../components/CreateRequisitionModal";
import { CreatePOModal } from "../components/CreatePOModal";

export const RequisitionsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: requisitions, isLoading } = useRequisitions(
    statusFilter ? { status: statusFilter } : undefined
  );

  const submitMutation = useSubmitRequisition();
  const approveMutation = useApproveRequisition();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedConvertReq, setSelectedConvertReq] = useState<any>(null);

  const handleSubmitRequisition = async (id: string) => {
    try {
      await submitMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to submit requisition.");
    }
  };

  const handleApproveRequisition = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to approve requisition.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-emerald-400" />
            Purchase Requisitions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Internal kitchen requests, approval queue, and purchase order conversions
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Requisition
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md">
        <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400 ml-2" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="CONVERTED_TO_PO">PO Generated</option>
        </select>
      </div>

      {/* Requisitions List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">Loading requisitions...</div>
        ) : requisitions && requisitions.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {requisitions.map((req) => (
              <div key={req.id} className="p-5 hover:bg-slate-200/70 dark:hover:bg-slate-800/20 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-400 text-sm">{req.requisition_number}</span>
                    <RequisitionStatusBadge status={req.status} />
                    <RequisitionPriorityBadge priority={req.priority} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {req.status === "DRAFT" && (
                      <button
                        onClick={() => handleSubmitRequisition(req.id)}
                        disabled={submitMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Submit for Approval
                      </button>
                    )}

                    {req.status === "SUBMITTED" && (
                      <button
                        onClick={() => handleApproveRequisition(req.id)}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve Request
                      </button>
                    )}

                    {req.status === "APPROVED" && (
                      <button
                        onClick={() => setSelectedConvertReq(req)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Convert to PO
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>Requested by: <strong className="text-slate-600 dark:text-slate-300">{req.requester_name}</strong></span>
                  <span>Location: <strong className="text-slate-600 dark:text-slate-300">{req.location}</strong></span>
                  {req.reason && <span>Reason: <em className="text-slate-600 dark:text-slate-300">"{req.reason}"</em></span>}
                </div>

                {/* Requested Line Items */}
                <div className="bg-slate-100/70 dark:bg-slate-950/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800/60">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                        <th className="pb-1.5">Item</th>
                        <th className="pb-1.5">SKU</th>
                        <th className="pb-1.5">Quantity</th>
                        <th className="pb-1.5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                      {req.items.map((line) => (
                        <tr key={line.id}>
                          <td className="py-1.5 font-medium text-slate-900 dark:text-white">{line.item_name}</td>
                          <td className="py-1.5 text-slate-500 dark:text-slate-400 font-mono">{line.sku}</td>
                          <td className="py-1.5 text-emerald-400 font-mono font-bold">
                            {line.quantity} {line.unit}
                          </td>
                          <td className="py-1.5 text-slate-500 text-[11px]">{line.notes || "-"}</td>
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
            No purchase requisitions found. Click "New Requisition" to create one.
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateRequisitionModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      )}

      {selectedConvertReq && (
        <CreatePOModal
          isOpen={Boolean(selectedConvertReq)}
          onClose={() => setSelectedConvertReq(null)}
          requisition={selectedConvertReq}
        />
      )}
    </div>
  );
};
