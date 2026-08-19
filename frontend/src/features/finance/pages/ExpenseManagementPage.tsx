import React, { useState } from "react";
import { useExpenses, useSubmitExpense, useApproveExpense } from "../hooks/useFinance";
import { CreateExpenseModal } from "../components/CreateExpenseModal";
import { Receipt, Plus, Search, Check, Send } from "lucide-react";

export const ExpenseManagementPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: expenses = [], isLoading } = useExpenses();
  const submitExpenseMutation = useSubmitExpense();
  const approveExpenseMutation = useApproveExpense();

  const handleSubmit = async (id: string) => {
    try {
      await submitExpenseMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to submit expense claim.");
    }
  };

  const handleApprove = async (id: string) => {
    if (confirm("Approve expense and post double-entry payment journal to General Ledger?")) {
      try {
        await approveExpenseMutation.mutateAsync(id);
      } catch (err: any) {
        alert(err?.response?.data?.error?.message || "Failed to approve expense.");
      }
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const query = searchQuery.toLowerCase();
    return (
      e.expense_number.toLowerCase().includes(query) ||
      e.payee.toLowerCase().includes(query) ||
      e.category.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Receipt className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Operational Expenses</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track utilities, rent, maintenance, marketing, and automatic double-entry expense postings
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Record Expense
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search expense #, payee, category..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 w-28">Expense #</th>
              <th className="p-4 w-28">Date</th>
              <th className="p-4">Payee / Vendor</th>
              <th className="p-4">Category</th>
              <th className="p-4">GL Account</th>
              <th className="p-4 w-24">Cost Center</th>
              <th className="p-4 w-28 font-mono text-right">Amount (₹)</th>
              <th className="p-4 w-24 text-center">Status</th>
              <th className="p-4 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-500">
                  Loading operational expenses...
                </td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-500">
                  No operational expenses recorded. Click "Record Expense" to create one.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{exp.expense_number}</td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{exp.expense_date}</td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">{exp.payee}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{exp.account_name}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{exp.cost_center}</td>
                  <td className="p-4 font-mono text-right font-bold text-rose-400">
                    ${parseFloat(exp.amount).toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        exp.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : exp.status === "SUBMITTED"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {exp.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {exp.status === "DRAFT" && (
                        <button
                          onClick={() => handleSubmit(exp.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Send className="w-3 h-3" /> Submit
                        </button>
                      )}
                      {exp.status === "SUBMITTED" && (
                        <button
                          onClick={() => handleApprove(exp.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                      )}
                      {exp.status === "APPROVED" && (
                        <span className="text-[11px] text-slate-500 font-medium">Posted</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isCreateOpen && <CreateExpenseModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
};
