import React, { useState } from "react";
import { useCreateAccount, useAccounts } from "../hooks/useFinance";
import { BookOpen, X } from "lucide-react";
import { AccountCategory, NormalBalance } from "../types/finance.types";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({ isOpen, onClose }) => {
  const createAccountMutation = useCreateAccount();
  const { data: accounts = [] } = useAccounts();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AccountCategory>("EXPENSE");
  const [normalBalance, setNormalBalance] = useState<NormalBalance>("DEBIT");
  const [parent, setParent] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleCategoryChange = (newCategory: AccountCategory) => {
    setCategory(newCategory);
    if (newCategory === "ASSET" || newCategory === "EXPENSE") {
      setNormalBalance("DEBIT");
    } else {
      setNormalBalance("CREDIT");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      alert("Account code and name are required.");
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        code: code.trim(),
        name: name.trim(),
        category,
        normal_balance: normalBalance,
        parent: parent || null,
        description: description.trim(),
        is_active: true,
      });
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to create account.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add General Ledger Account</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Expand Chart of Accounts hierarchy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Account Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 6450"
                className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as AccountCategory)}
                className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ASSET">Asset (1xxx)</option>
                <option value="LIABILITY">Liability (2xxx)</option>
                <option value="EQUITY">Equity (3xxx)</option>
                <option value="REVENUE">Revenue (4xxx)</option>
                <option value="EXPENSE">Expense (5xxx / 6xxx)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Account Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Social Media Advertising Expense"
              className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Normal Balance
              </label>
              <select
                value={normalBalance}
                onChange={(e) => setNormalBalance(e.target.value as NormalBalance)}
                className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="DEBIT">Debit (Dr)</option>
                <option value="CREDIT">Credit (Cr)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Parent Account
              </label>
              <select
                value={parent}
                onChange={(e) => setParent(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- No Parent (Root) --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope and purpose of this account"
              className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAccountMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {createAccountMutation.isPending ? "Creating..." : "Save Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
