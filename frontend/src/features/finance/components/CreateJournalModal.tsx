import React, { useState } from "react";
import { useCreateJournal, useAccounts } from "../hooks/useFinance";
import { Scale, Plus, Trash2, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { CostCenter, SourceDocumentType } from "../types/finance.types";

interface CreateJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LineItemForm {
  account_id: string;
  debit: string;
  credit: string;
  description: string;
  reference: string;
  cost_center: CostCenter;
}

export const CreateJournalModal: React.FC<CreateJournalModalProps> = ({ isOpen, onClose }) => {
  const createJournalMutation = useCreateJournal();
  const { data: accounts = [] } = useAccounts();

  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [sourceType, setSourceType] = useState<SourceDocumentType>("MANUAL");
  const [notes, setNotes] = useState("");
  const [autoPost, setAutoPost] = useState(true);

  const [lines, setLines] = useState<LineItemForm[]>([
    { account_id: "", debit: "0.00", credit: "0.00", description: "", reference: "", cost_center: "ADMIN" },
    { account_id: "", debit: "0.00", credit: "0.00", description: "", reference: "", cost_center: "ADMIN" },
  ]);

  if (!isOpen) return null;

  const handleLineChange = (index: number, field: keyof LineItemForm, value: string) => {
    const next = [...lines];
    next[index] = { ...next[index], [field]: value };
    setLines(next);
  };

  const handleAddLine = () => {
    setLines([
      ...lines,
      { account_id: "", debit: "0.00", credit: "0.00", description: "", reference: "", cost_center: "ADMIN" },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) {
      alert("A journal entry requires at least 2 lines.");
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  // Compute totals
  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBalanced && autoPost) {
      alert("Cannot post an unbalanced journal! Total Debits must equal Total Credits.");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].account_id) {
        alert(`Please select an account for line #${i + 1}`);
        return;
      }
    }

    try {
      await createJournalMutation.mutateAsync({
        entry_date: entryDate,
        source_document_type: sourceType,
        notes: notes.trim(),
        auto_post: autoPost,
        lines: lines.map((l) => ({
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description.trim(),
          reference: l.reference.trim(),
          cost_center: l.cost_center,
        })),
      });
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to create journal entry.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create Double-Entry Journal</h2>
              <p className="text-xs text-slate-400">Post balanced debit and credit legs to General Ledger</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Posting Date
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Source Document Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceDocumentType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="MANUAL">Manual Adjustment</option>
                <option value="EXPENSE">Expense Claim</option>
                <option value="SALE">Sales Settlement</option>
                <option value="ADJUSTMENT">Inventory Revaluation</option>
                <option value="CASH_PAYOUT">Cash Payout</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="relative flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={autoPost}
                  onChange={(e) => setAutoPost(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Auto-Post immediately</span>
              </label>
            </div>
          </div>

          {/* Journal Lines Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Journal Lines</h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                <Plus className="w-3.5 h-3.5" /> Add Leg
              </button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Account</th>
                    <th className="p-3 w-32">Debit ($)</th>
                    <th className="p-3 w-32">Credit ($)</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 w-36">Cost Center</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/30">
                      <td className="p-2.5">
                        <select
                          value={line.account_id}
                          onChange={(e) => handleLineChange(idx, "account_id", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          required
                        >
                          <option value="">-- Select GL Account --</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {a.name} ({a.category})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit}
                          onChange={(e) => handleLineChange(idx, "debit", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit}
                          onChange={(e) => handleLineChange(idx, "credit", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                          placeholder="Line narration"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={line.cost_center}
                          onChange={(e) => handleLineChange(idx, "cost_center", e.target.value as CostCenter)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="KITCHEN">Kitchen</option>
                          <option value="FOH">Front of House</option>
                          <option value="BAR">Bar</option>
                          <option value="DELIVERY">Delivery</option>
                          <option value="ADMIN">Admin</option>
                          <option value="MARKETING">Marketing</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mathematical Integrity Footer */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-400">Total Debits: </span>
                <strong className="text-white font-mono text-sm">${totalDebit.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Total Credits: </span>
                <strong className="text-white font-mono text-sm">${totalCredit.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Difference: </span>
                <strong className={`font-mono text-sm ${difference < 0.001 ? "text-emerald-400" : "text-rose-400"}`}>
                  ${difference.toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isBalanced ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" /> Balanced
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                  <AlertTriangle className="w-4 h-4" /> Unbalanced
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Journal Notes & Justification
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this journal adjustment is recorded..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createJournalMutation.isPending || (autoPost && !isBalanced)}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {createJournalMutation.isPending ? "Recording..." : autoPost ? "Post Journal Entry" : "Save Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
