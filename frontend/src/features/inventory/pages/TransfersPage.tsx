import React, { useState } from 'react';
import { ArrowRightLeft, Plus } from 'lucide-react';
import { useTransfers, useApproveTransfer, useReceiveTransfer } from '../hooks/useInventory';
import { CreateTransferModal } from '../components/CreateTransferModal';

export const TransfersPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: transfers = [], isLoading } = useTransfers();
  const approveMutation = useApproveTransfer();
  const receiveMutation = useReceiveTransfer();

  const handleApprove = async (id: string) => {
    await approveMutation.mutateAsync(id);
  };

  const handleReceive = async (id: string) => {
    await receiveMutation.mutateAsync(id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ArrowRightLeft className="w-7 h-7 text-indigo-400" />
            Inter-Location Inventory Transfers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Requisition and transfer stock between Main Store, Kitchen, Bar, and Walk-in Coolers
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-400 font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Request Stock Transfer
        </button>
      </div>

      {/* Transfers Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Transfer #</th>
                <th className="py-3.5 px-4 font-semibold">Source ➔ Destination</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Items</th>
                <th className="py-3.5 px-4 font-semibold">Requested By</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Loading transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No stock transfers recorded. Click "Request Stock Transfer" to initiate.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-200/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                      {t.transfer_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-700 dark:text-slate-200 font-semibold">
                        {t.source_location} ➔ {t.destination_location}
                      </div>
                      {t.notes && <div className="text-slate-500 text-[11px]">{t.notes}</div>}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          t.status === 'RECEIVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : t.status === 'IN_TRANSIT'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        {t.items?.map((item, idx) => (
                          <div key={idx} className="text-slate-600 dark:text-slate-300">
                            {item.item_name}: <span className="font-mono text-slate-500 dark:text-slate-400">{Number(item.quantity).toFixed(2)} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {t.requested_by_name || 'Staff'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(t.requested_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {t.status === 'REQUESTED' && (
                        <button
                          onClick={() => handleApprove(t.id)}
                          disabled={approveMutation.isPending}
                          className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-semibold text-xs transition-colors"
                        >
                          Approve & Dispatch
                        </button>
                      )}

                      {t.status === 'IN_TRANSIT' && (
                        <button
                          onClick={() => handleReceive(t.id)}
                          disabled={receiveMutation.isPending}
                          className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold text-xs transition-colors"
                        >
                          Confirm Receipt
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

      {isCreateOpen && (
        <CreateTransferModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      )}
    </div>
  );
};
