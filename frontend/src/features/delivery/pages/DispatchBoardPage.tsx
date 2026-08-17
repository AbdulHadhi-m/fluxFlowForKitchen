import React, { useState } from 'react';
import { useDeliveries, useDeliveryZones, useDeliveryDrivers, useDeliveryActionMutation } from '../hooks/useDelivery';
import { DispatchTable } from '../components/DispatchTable';
import { AssignDriverModal } from '../components/AssignDriverModal';
import { DeliveryListItem } from '../types/delivery.types';
import { Search, RefreshCw, Send, Loader2 } from 'lucide-react';

export const DispatchBoardPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryListItem | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const { data: zones = [] } = useDeliveryZones();
  const { data: drivers = [] } = useDeliveryDrivers();
  const {
    data: deliveries = [],
    isLoading,
    refetch,
  } = useDeliveries({
    status: selectedStatus || undefined,
    zone_id: selectedZone || undefined,
    driver_id: selectedDriver || undefined,
    search: searchQuery || undefined,
  });

  const actionMutation = useDeliveryActionMutation();

  const handleOpenAssign = (delivery: DeliveryListItem) => {
    setSelectedDelivery(delivery);
    setIsAssignModalOpen(true);
  };

  const handlePickup = (id: string) => actionMutation.mutate({ action: 'pickup', deliveryId: id });
  const handleStart = (id: string) => actionMutation.mutate({ action: 'start', deliveryId: id });
  const handleComplete = (id: string) => actionMutation.mutate({ action: 'complete', deliveryId: id });

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'All Statuses' },
    { value: 'READY_FOR_DISPATCH', label: 'Ready for Dispatch' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'PICKED_UP', label: 'Picked Up' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'PENDING', label: 'In Kitchen (Pending)' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Send className="w-7 h-7 text-amber-500" /> Dispatch Board
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live order fulfillment queue, driver allocations, and transit status transitions
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-amber-500" /> Refresh Queue
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer, phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Zone Filter */}
        <div>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Delivery Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} (${z.fee})
              </option>
            ))}
          </select>
        </div>

        {/* Driver Filter */}
        <div>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">All Couriers</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} ({d.availability_status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Deliveries Dispatch Table */}
      {isLoading ? (
        <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading dispatch board data...</p>
        </div>
      ) : (
        <DispatchTable
          deliveries={deliveries}
          onAssignDriver={handleOpenAssign}
          onPickup={handlePickup}
          onStart={handleStart}
          onComplete={handleComplete}
        />
      )}

      {/* Driver Assignment Modal */}
      <AssignDriverModal
        delivery={selectedDelivery}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </div>
  );
};
