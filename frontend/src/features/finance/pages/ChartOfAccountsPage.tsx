import React, { useState } from "react";
import { useAccounts, useSeedDefaultAccounts } from "../hooks/useFinance";
import { CreateAccountModal } from "../components/CreateAccountModal";
import { BookOpen, Plus, Sparkles, Search, Lock, CheckCircle2 } from "lucide-react";
import { AccountCategory } from "../types/finance.types";

export const ChartOfAccountsPage: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: accounts = [], isLoading } = useAccounts(
    categoryFilter ? { category: categoryFilter } : undefined
  );
  const seedDefaultsMutation = useSeedDefaultAccounts();

  const filteredAccounts = accounts.filter((a) => {
    const query = searchQuery.toLowerCase();
    return a.code.toLowerCase().includes(query) || a.name.toLowerCase().includes(query);
  });

  const handleSeedDefaults = async () => {
    if (confirm("Seed standard restaurant Chart of Accounts (Assets, Liabilities, Equity, Revenue, COGS, Expenses)?")) {
      await seedDefaultsMutation.mutateAsync();
    }
  };

  const getCategoryBadgeClass = (cat: AccountCategory) => {
    switch (cat) {
      case "ASSET":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "LIABILITY":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "EQUITY":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "REVENUE":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "EXPENSE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Chart of Accounts (COA)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            General Ledger account taxonomy, category classifications, and double-entry rules
          </p>
        </div>

        <div className="flex items-center gap-3">
          {accounts.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              disabled={seedDefaultsMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Seed Standard Accounts
            </button>
          )}

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Account
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {cat ? cat : "All Categories"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code or account title..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 w-28">Code</th>
              <th className="p-4">Account Title</th>
              <th className="p-4 w-36">Category</th>
              <th className="p-4 w-32">Normal Balance</th>
              <th className="p-4">Description</th>
              <th className="p-4 w-28 text-center">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500">
                  Loading Chart of Accounts...
                </td>
              </tr>
            ) : filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500">
                  No accounts found. Click "Seed Standard Accounts" to initialize.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-white text-sm">{acc.code}</td>
                  <td className="p-4 font-semibold text-slate-200">
                    <div className="flex items-center gap-2">
                      <span>{acc.name}</span>
                      {acc.is_system_account && (
                        <span title="Protected System Account">
                          <Lock className="w-3 h-3 text-slate-500" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(acc.category)}`}>
                      {acc.category_display || acc.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-300 font-medium">
                    {acc.normal_balance === "DEBIT" ? "Debit (Dr)" : "Credit (Cr)"}
                  </td>
                  <td className="p-4 text-slate-400 truncate max-w-xs">{acc.description || "—"}</td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isCreateOpen && <CreateAccountModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
};
