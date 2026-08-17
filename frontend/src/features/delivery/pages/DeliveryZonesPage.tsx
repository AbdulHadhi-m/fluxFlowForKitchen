import React, { useState } from 'react';
import { useDeliveryZones, useDeleteZoneMutation } from '../hooks/useDelivery';
import { CreateZoneModal } from '../components/CreateZoneModal';
import { DeliveryZone } from '../types/delivery.types';
import { MapPin, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';

export const DeliveryZonesPage: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: zones = [], isLoading } = useDeliveryZones();
  const deleteMutation = useDeleteZoneMutation();

  const handleEdit = (zone: DeliveryZone) => {
    setSelectedZone(zone);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedZone(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this delivery zone?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <MapPin className="w-7 h-7 text-amber-500" /> Geographic Delivery Zones
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure delivery coverage sectors, postal code matches, fees, and minimum spend rules
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Delivery Zone
        </button>
      </div>

      {/* Zones Grid */}
      {isLoading ? (
        <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading delivery zones...</p>
        </div>
      ) : zones.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
          <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Delivery Zones Configured</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
            Create custom delivery zones with specific postal codes and fees to enable doorstep delivery.
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
          >
            Create First Zone
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((z) => (
            <div
              key={z.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl space-y-4 shadow-xl transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{z.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                      P-{z.priority}
                    </span>
                  </div>
                  {z.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{z.description}</p>
                  )}
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    z.is_active
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {z.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>

              {/* Postal Codes Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Postal Codes ({z.postal_codes.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {z.postal_codes.map((pc, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-mono bg-slate-950 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-800"
                    >
                      {pc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Details Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
                <div className="bg-slate-950/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Fee</span>
                  <span className="text-xs font-bold text-amber-400">${z.fee}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Min. Order</span>
                  <span className="text-xs font-bold text-white">${z.minimum_order}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">Transit</span>
                  <span className="text-xs font-bold text-cyan-400">{z.estimated_minutes}m</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                <button
                  onClick={() => handleEdit(z)}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="Edit Zone"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(z.id)}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-rose-500/20 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete Zone"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <CreateZoneModal
        zone={selectedZone}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
