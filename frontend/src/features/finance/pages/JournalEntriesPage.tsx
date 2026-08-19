import React, { useState } from "react";
import { useJournals, usePostJournal, useVoidJournal } from "../hooks/useFinance";
import { CreateJournalModal } from "../components/CreateJournalModal";
import { Scale, Plus, Search, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { JournalStatus } from "../types/finance.types";

export const JournalEntriesPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null);

  const { data: journals = [], isLoading } = useJournals(
    statusFilter ? { status: statusFilter } : undefined
  );
  const postJournalMutation = usePostJournal();
  const voidJournalMutation = useVoidJournal();

  const handlePost = async (id: string) => {
    if (confirm("Post this journal entry to the authoritative General Ledger?")) {
      try {
        await postJournalMutation.mutateAsync(id);
      } catch (err: any) {
        alert(err?.response?.data?.error?.message || "Failed to post journal entry.");
      }
    }
  };

  const handleVoid = async (id: string) => {
    const reason = prompt("Please provide a reason for voiding/reversing this entry:");
    if (reason) {
      try {
        await voidJournalMutation.mutateAsync({ id, reason });
      } catch (err: any) {
        alert(err?.response?.data?.error?.message || "Failed to void journal entry.");
      }
    }
  };

  const filteredJournals = journals.filter((j) => {
    const query = searchQuery.toLowerCase();
    return (
      j.entry_number.toLowerCase().includes(query) ||
      (j.notes && j.notes.toLowerCase().includes(query)) ||
      j.source_document_type.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: JournalStatus) => {
    switch (status) {
      case "POSTED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "DRAFT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "VOIDED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Scale className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">General Journal Entries</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immutable double-entry transaction ledger, automatic sales & expense postings
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Journal Entry
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          {["", "POSTED", "DRAFT", "VOIDED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {st ? st : "All Statuses"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search JE number, type, notes..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Journal Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 w-10"></th>
              <th className="p-4 w-32">Entry #</th>
              <th className="p-4 w-28">Date</th>
              <th className="p-4 w-36">Source Document</th>
              <th className="p-4">Notes / Narration</th>
              <th className="p-4 w-28 font-mono text-right">Debit Total</th>
              <th className="p-4 w-28 font-mono text-right">Credit Total</th>
              <th className="p-4 w-24 text-center">Status</th>
              <th className="p-4 w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-500">
                  Loading General Journal entries...
                </td>
              </tr>
            ) : filteredJournals.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-500">
                  No journal entries found. Click "New Journal Entry" to create one.
                </td>
              </tr>
            ) : (
              filteredJournals.map((j) => {
                const isExpanded = expandedJournalId === j.id;
                return (
                  <React.Fragment key={j.id}>
                    <tr className="hover:bg-slate-100/70 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setExpandedJournalId(isExpanded ? null : j.id)}
                          className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{j.entry_number}</td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{j.entry_date}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          {j.source_document_type}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 truncate max-w-xs">{j.notes || "—"}</td>
                      <td className="p-4 font-mono text-right font-bold text-slate-900 dark:text-white">${parseFloat(j.total_debit).toFixed(2)}</td>
                      <td className="p-4 font-mono text-right font-bold text-slate-900 dark:text-white">${parseFloat(j.total_credit).toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(j.status)}`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {j.status === "DRAFT" && (
                            <button
                              onClick={() => handlePost(j.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            >
                              Post
                            </button>
                          )}
                          {j.status === "POSTED" && (
                            <button
                              onClick={() => handleVoid(j.id)}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Void & Reverse Entry"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Line Items Inspector */}
                    {isExpanded && (
                      <tr className="bg-slate-100/80 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
                        <td colSpan={9} className="p-4 pl-12 space-y-2">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Debit & Credit Legs</p>
                          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                                <tr>
                                  <th className="p-2.5">Account</th>
                                  <th className="p-2.5 w-28 text-right font-mono">Debit ($)</th>
                                  <th className="p-2.5 w-28 text-right font-mono">Credit ($)</th>
                                  <th className="p-2.5">Narration</th>
                                  <th className="p-2.5 w-28">Cost Center</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-slate-100/60 dark:bg-slate-950/30">
                                {j.lines.map((l, idx) => (
                                  <tr key={idx}>
                                    <td className="p-2.5 font-medium text-slate-700 dark:text-slate-200">
                                      <span className="font-mono text-indigo-400 font-bold mr-2">{l.account_code}</span>
                                      {l.account_name}
                                    </td>
                                    <td className="p-2.5 font-mono text-right text-emerald-400">
                                      {parseFloat(l.debit) > 0 ? `$${parseFloat(l.debit).toFixed(2)}` : "—"}
                                    </td>
                                    <td className="p-2.5 font-mono text-right text-indigo-400">
                                      {parseFloat(l.credit) > 0 ? `$${parseFloat(l.credit).toFixed(2)}` : "—"}
                                    </td>
                                    <td className="p-2.5 text-slate-500 dark:text-slate-400">{l.description || "—"}</td>
                                    <td className="p-2.5 text-slate-500 dark:text-slate-400">{l.cost_center}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isCreateOpen && <CreateJournalModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
};
