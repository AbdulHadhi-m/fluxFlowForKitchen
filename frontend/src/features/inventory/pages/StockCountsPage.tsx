import React, { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { useStockCounts, useCreateStockCount } from '../hooks/useInventory';
import { StockCountReviewModal } from '../components/StockCountReviewModal';
import { StockCount } from '../types/inventory.types';

export const StockCountsPage: React.FC = () => {
  const [selectedCount, setSelectedCount] = useState<StockCount | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLocation, setNewLocation] = useState('ALL');
  const [newNotes, setNewNotes] = useState('');

  const { data: counts = [], isLoading } = useStockCounts();
  const createCountMutation = useCreateStockCount();

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createCountMutation.mutateAsync({
        location: newLocation,
        notes: newNotes,
      });
      setIsCreateOpen(false);
      setSelectedCount(created);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-emerald-400" />
            Physical Stock Audits & Variance Reconciliation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Conduct periodic physical stocktaking sessions and auto-reconcile book balances
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Start New Audit Count
        </button>
      </div>

      {/* Stock Count List Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Audit Session #</th>
                <th className="py-3.5 px-4 font-semibold">Location</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Audited Items</th>
                <th className="py-3.5 px-4 font-semibold">Counted By</th>
                <th className="py-3.5 px-4 font-semibold">Approved By</th>
                <th className="py-3.5 px-4 font-semibold">Created Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Loading stock count sessions...
                  </td>
                </tr>
              ) : counts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No physical count audits recorded. Click "Start New Audit Count" to begin.
                  </td>
                </tr>
              ) : (
                counts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                      {c.count_number}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {c.location}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          c.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : c.status === 'SUBMITTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {c.items?.length || 0} items
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {c.counted_by_name || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {c.approved_by_name || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCount(c)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
                      >
                        {c.status === 'APPROVED' ? 'View Audit' : 'Enter / Review'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Audit Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Initialize Stock Count Audit</h2>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Storage Location
                </label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:border-emerald-500"
                >
                  <option value="ALL">Entire Restaurant (All Locations)</option>
                  <option value="MAIN_STORE">Main Store</option>
                  <option value="KITCHEN">Kitchen</option>
                  <option value="BAR">Bar</option>
                  <option value="WALK_IN_FREEZER">Walk-in Freezer</option>
                  <option value="DRY_STORAGE">Dry Storage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Audit Notes / Shift
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. End of Month Inventory Audit"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCountMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-sm font-semibold transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {createCountMutation.isPending ? 'Starting...' : 'Start Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedCount && (
        <StockCountReviewModal
          stockCount={selectedCount}
          isOpen={!!selectedCount}
          onClose={() => setSelectedCount(null)}
        />
      )}
    </div>
  );
};
