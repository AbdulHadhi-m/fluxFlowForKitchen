import React, { useState } from "react";
import { usePeriods, useCreatePeriod, useClosePeriod, useReopenPeriod } from "../hooks/useFinance";
import { Calendar, Plus, Lock, Unlock } from "lucide-react";

export const FinancialPeriodsPage: React.FC = () => {
  const { data: periods = [], isLoading } = usePeriods();
  const createPeriodMutation = useCreatePeriod();
  const closePeriodMutation = useClosePeriod();
  const reopenPeriodMutation = useReopenPeriod();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createPeriodMutation.mutateAsync({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        status: "OPEN",
      });
      setIsCreating(false);
      setName("");
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to create financial period.");
    }
  };

  const handleClose = async (id: string) => {
    const notes = prompt("Enter period closing audit notes:");
    if (notes) {
      try {
        await closePeriodMutation.mutateAsync({ id, notes });
      } catch (err: any) {
        alert(err?.response?.data?.error?.message || "Failed to close period.");
      }
    }
  };

  const handleReopen = async (id: string) => {
    if (confirm("Reopen closed financial period? This action is audited.")) {
      try {
        await reopenPeriodMutation.mutateAsync(id);
      } catch (err: any) {
        alert(err?.response?.data?.error?.message || "Failed to reopen period.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Calendar className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Financial Periods & Close Controls</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Accounting period calendar, locking closed periods against backdated postings
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Period
        </button>
      </div>

      {/* Creation Box */}
      {isCreating && (
        <form onSubmit={handleCreate} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">New Financial Accounting Period</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Period Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. FY2026-M09 September"
                className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPeriodMutation.isPending}
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
            >
              Save Period
            </button>
          </div>
        </form>
      )}

      {/* Periods Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4">Period Name</th>
              <th className="p-4 w-32">Start Date</th>
              <th className="p-4 w-32">End Date</th>
              <th className="p-4 w-28 text-center">Status</th>
              <th className="p-4">Closed By</th>
              <th className="p-4">Audit Notes</th>
              <th className="p-4 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500">
                  Loading financial periods...
                </td>
              </tr>
            ) : periods.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500">
                  No periods defined. Click "Create Period" to set up monthly accounting cycles.
                </td>
              </tr>
            ) : (
              periods.map((p) => (
                <tr key={p.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-bold text-slate-900 dark:text-white text-sm">{p.name}</td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{p.start_date}</td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{p.end_date}</td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        p.status === "OPEN"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {p.status === "OPEN" ? "Open" : "Locked / Closed"}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{p.closed_by_name || "—"}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 truncate max-w-xs">{p.notes || "—"}</td>
                  <td className="p-4 text-right">
                    {p.status === "OPEN" ? (
                      <button
                        onClick={() => handleClose(p.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                      >
                        <Lock className="w-3 h-3" /> Close
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReopen(p.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <Unlock className="w-3 h-3 text-amber-400" /> Reopen
                      </button>
                    )}
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
