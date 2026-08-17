import React, { useState } from 'react';
import { Trash2, Plus, AlertOctagon } from 'lucide-react';
import { useWasteRecords } from '../hooks/useInventory';
import { LogWasteModal } from '../components/LogWasteModal';

export const WasteLogPage: React.FC = () => {
  const [isLogOpen, setIsLogOpen] = useState(false);
  const { data: wasteRecords = [], isLoading } = useWasteRecords();

  const totalLoss = wasteRecords.reduce(
    (sum, r) => sum + Number(r.total_loss_cost || 0),
    0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Trash2 className="w-7 h-7 text-rose-400" />
            Kitchen Wastage & Spoilage Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track kitchen shrinkage, trimming losses, burnt dishes, and cost attributions
          </p>
        </div>

        <button
          onClick={() => setIsLogOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 text-white hover:bg-rose-400 font-semibold text-sm transition-all shadow-lg shadow-rose-500/20"
        >
          <Plus className="w-4 h-4" />
          Log Wastage Entry
        </button>
      </div>

      {/* Loss Summary Banner */}
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-rose-300 font-semibold uppercase tracking-wider block">
              Cumulative Waste Loss Recorded
            </span>
            <span className="text-xl font-bold text-rose-400">
              ${totalLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <span className="text-xs text-slate-400">{wasteRecords.length} incidents logged</span>
      </div>

      {/* Waste Ledger Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Item</th>
                <th className="py-3.5 px-4 font-semibold">Quantity Wasted</th>
                <th className="py-3.5 px-4 font-semibold">Cost Loss</th>
                <th className="py-3.5 px-4 font-semibold">Reason Category</th>
                <th className="py-3.5 px-4 font-semibold">Station / Location</th>
                <th className="py-3.5 px-4 font-semibold">Reported By</th>
                <th className="py-3.5 px-4 font-semibold">Notes</th>
                <th className="py-3.5 px-4 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading waste records...
                  </td>
                </tr>
              ) : wasteRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No wastage entries recorded. Kitchen shrinkage is currently zero.
                  </td>
                </tr>
              ) : (
                wasteRecords.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {w.item_name}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {Number(w.quantity).toFixed(3)} {w.unit}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                      ${Number(w.total_loss_cost).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {w.reason.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {w.location}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {w.reported_by_name || 'Kitchen Staff'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {w.notes || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-right">
                      {new Date(w.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isLogOpen && <LogWasteModal isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />}
    </div>
  );
};
