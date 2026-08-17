import React, { useState } from "react";
import { useSupplierInvoices } from "../hooks/useProcurement";
import { FileCheck, Plus, CheckCircle2, AlertTriangle, Filter } from "lucide-react";
import { InvoiceMatchingModal } from "../components/InvoiceMatchingModal";

export const InvoiceMatchingPage: React.FC = () => {
  const [matchStatusFilter, setMatchStatusFilter] = useState("");
  const { data: invoices, isLoading } = useSupplierInvoices(
    matchStatusFilter ? { match_status: matchStatusFilter } : undefined
  );

  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <FileCheck className="w-7 h-7 text-cyan-400" />
            3-Way Invoice Matching
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated reconciliation between Purchase Orders, Dock Intake Receipts, and Vendor Invoices
          </p>
        </div>

        <button
          onClick={() => setIsMatchModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-lg shadow-cyan-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Match Vendor Invoice
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <Filter className="w-4 h-4 text-slate-400 ml-2" />
        <select
          value={matchStatusFilter}
          onChange={(e) => setMatchStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Reconciliation Statuses</option>
          <option value="MATCHED">Matched (Zero Variance)</option>
          <option value="VARIANCE">Variance Detected</option>
        </select>
      </div>

      {/* Invoices List */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading invoice matches...</div>
        ) : invoices && invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="p-4 font-semibold">Invoice #</th>
                  <th className="p-4 font-semibold">PO Number</th>
                  <th className="p-4 font-semibold">Vendor</th>
                  <th className="p-4 font-semibold">Invoice Date</th>
                  <th className="p-4 font-semibold">Invoiced Total</th>
                  <th className="p-4 font-semibold">Match Status</th>
                  <th className="p-4 font-semibold">Variance Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((inv) => {
                  const isMatched = inv.match_status === "MATCHED";
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/20">
                      <td className="p-4 font-mono font-bold text-white">{inv.invoice_number}</td>
                      <td className="p-4 font-mono text-cyan-400">{inv.po_number || "-"}</td>
                      <td className="p-4 font-semibold text-slate-200">{inv.supplier_name}</td>
                      <td className="p-4 text-slate-400">{inv.invoice_date}</td>
                      <td className="p-4 font-mono font-bold text-emerald-400">${inv.total_amount}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isMatched
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {isMatched ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {isMatched ? "Matched 100%" : "Variance"}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {isMatched ? (
                          <span className="text-slate-500">None</span>
                        ) : (
                          <span className="text-amber-400">
                            Qty Var: {inv.quantity_variance} | Price Var: ${inv.price_variance}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500 text-sm">
            No supplier invoice matches recorded. Click "Match Vendor Invoice" to start 3-way matching.
          </div>
        )}
      </div>

      {/* Match Modal */}
      {isMatchModalOpen && (
        <InvoiceMatchingModal isOpen={isMatchModalOpen} onClose={() => setIsMatchModalOpen(false)} />
      )}
    </div>
  );
};
