import React from "react";
import { usePayables } from "../hooks/useFinance";
import { Building2 } from "lucide-react";

export const AccountsPayablePage: React.FC = () => {
  const { data: payables = [], isLoading } = usePayables();

  const totalOutstanding = payables.reduce((sum, p) => sum + (parseFloat(p.balance_due) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Accounts Payable (Supplier Obligations)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supplier invoices, procurement payments, and outstanding vendor liabilities
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <span className="text-xs text-slate-400">Total Outstanding AP:</span>
          <strong className="text-base font-mono text-rose-400 font-bold">${totalOutstanding.toFixed(2)}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 w-28">Invoice #</th>
              <th className="p-4">Vendor / Supplier</th>
              <th className="p-4 w-28">PO #</th>
              <th className="p-4 w-28">Due Date</th>
              <th className="p-4 w-28 font-mono text-right">Total ($)</th>
              <th className="p-4 w-28 font-mono text-right">Paid ($)</th>
              <th className="p-4 w-28 font-mono text-right">Balance Due</th>
              <th className="p-4 w-24 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  Loading supplier payables...
                </td>
              </tr>
            ) : payables.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500">
                  No open supplier payables found.
                </td>
              </tr>
            ) : (
              payables.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-white">{p.invoice_number}</td>
                  <td className="p-4 font-semibold text-slate-200">{p.supplier_name}</td>
                  <td className="p-4 font-mono text-indigo-400">{p.po_number || "—"}</td>
                  <td className="p-4 font-mono text-slate-300">{p.due_date}</td>
                  <td className="p-4 font-mono text-right text-white">${parseFloat(p.total_amount).toFixed(2)}</td>
                  <td className="p-4 font-mono text-right text-emerald-400">${parseFloat(p.paid_amount).toFixed(2)}</td>
                  <td className="p-4 font-mono text-right font-bold text-rose-400">${parseFloat(p.balance_due).toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
