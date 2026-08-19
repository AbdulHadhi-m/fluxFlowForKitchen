import React, { useState } from "react";
import {
  usePurchaseReturns,
  useSupplierCredits,
  useApprovePurchaseReturn,
} from "../hooks/useProcurement";
import {
  RotateCcw,
  Plus,
  CheckCircle,
  CreditCard,
  Building2,
} from "lucide-react";
import { CreateReturnModal } from "../components/CreateReturnModal";

export const PurchaseReturnsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"returns" | "credits">("returns");
  const { data: returns, isLoading: returnsLoading } = usePurchaseReturns();
  const { data: credits, isLoading: creditsLoading } = useSupplierCredits();
  const approveReturnMutation = useApprovePurchaseReturn();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleApproveAndDispatch = async (returnId: string) => {
    try {
      await approveReturnMutation.mutateAsync(returnId);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to dispatch return.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <RotateCcw className="w-7 h-7 text-rose-400" />
            Purchase Returns & Supplier Credits
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Goods return workflows, supplier credits ledger, and automatic stock reversals
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Return
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("returns")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "returns"
              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/40"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Returns ({returns?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("credits")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "credits"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/40"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Credit Notes Ledger ({credits?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "returns" ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md overflow-hidden">
          {returnsLoading ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">Loading purchase returns...</div>
          ) : returns && returns.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {returns.map((ret) => (
                <div key={ret.id} className="p-5 hover:bg-slate-200/70 dark:hover:bg-slate-800/20 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-rose-400 text-sm">{ret.return_number}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        {ret.status}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Reason: <strong className="text-slate-700 dark:text-slate-200">{ret.reason}</strong></span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        Credit Claim: ${ret.total_credit_amount}
                      </span>

                      {ret.status === "REQUESTED" && (
                        <button
                          onClick={() => handleApproveAndDispatch(ret.id)}
                          disabled={approveReturnMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve & Dispatch
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      Vendor: <strong className="text-slate-900 dark:text-white ml-1">{ret.supplier_name}</strong>
                    </span>
                    <span>Requested by: <strong className="text-slate-600 dark:text-slate-300">{ret.requested_by_name}</strong></span>
                  </div>

                  {/* Return Lines */}
                  <div className="bg-slate-100/70 dark:bg-slate-950/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800/60">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                          <th className="pb-1.5">Returned Item</th>
                          <th className="pb-1.5">Quantity</th>
                          <th className="pb-1.5">Unit Cost</th>
                          <th className="pb-1.5">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                        {ret.items.map((line) => (
                          <tr key={line.id}>
                            <td className="py-1.5 font-medium text-slate-900 dark:text-white">{line.item_name}</td>
                            <td className="py-1.5 font-mono text-rose-400">
                              {line.quantity} {line.unit}
                            </td>
                            <td className="py-1.5 font-mono text-slate-500 dark:text-slate-400">${line.unit_cost}</td>
                            <td className="py-1.5 font-mono text-emerald-400">${line.line_total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 text-sm">No return records found.</div>
          )}
        </div>
      ) : (
        /* Credits Ledger */
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md overflow-hidden">
          {creditsLoading ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">Loading credits ledger...</div>
          ) : credits && credits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="p-4 font-semibold">Credit Note #</th>
                    <th className="p-4 font-semibold">Vendor</th>
                    <th className="p-4 font-semibold">Amount</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Issued Date</th>
                    <th className="p-4 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {credits.map((cr) => (
                    <tr key={cr.id} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/20">
                      <td className="p-4 font-mono font-bold text-emerald-400">{cr.credit_note_number}</td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">{cr.supplier_name}</td>
                      <td className="p-4 font-mono font-bold text-emerald-400">${cr.amount}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {cr.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">{cr.issued_date}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{cr.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 text-sm">No supplier credits recorded.</div>
          )}
        </div>
      )}

      {/* Modal */}
      {isCreateModalOpen && (
        <CreateReturnModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
};
