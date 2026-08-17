import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDeliveries, useDeliveryMetrics, useDeliveryActionMutation } from '../hooks/useDelivery';
import { DeliveryMetricsCards } from '../components/DeliveryMetricsCards';
import { DispatchTable } from '../components/DispatchTable';
import { AssignDriverModal } from '../components/AssignDriverModal';
import { DeliveryListItem } from '../types/delivery.types';
import { Truck, MapPin, Users, Send, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

export const DeliveryDashboardPage: React.FC = () => {
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryListItem | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const { data: metrics, isLoading: loadingMetrics, refetch: refetchMetrics } = useDeliveryMetrics();
  const { data: activeDeliveries = [], isLoading: loadingDeliveries, refetch: refetchDeliveries } = useDeliveries();
  const actionMutation = useDeliveryActionMutation();

  const handleOpenAssign = (delivery: DeliveryListItem) => {
    setSelectedDelivery(delivery);
    setIsAssignModalOpen(true);
  };

  const handlePickup = (id: string) => actionMutation.mutate({ action: 'pickup', deliveryId: id });
  const handleStart = (id: string) => actionMutation.mutate({ action: 'start', deliveryId: id });
  const handleComplete = (id: string) => actionMutation.mutate({ action: 'complete', deliveryId: id });

  const handleRefresh = () => {
    refetchMetrics();
    refetchDeliveries();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-amber-500" /> Delivery & Dispatch Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time courier dispatching, geographic delivery zones, and doorstep order fulfillment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh Deliveries"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/delivery/dispatch"
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
          >
            <Send className="w-4 h-4" /> Dispatch Board
          </Link>
          <Link
            to="/delivery/zones"
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <MapPin className="w-4 h-4 text-amber-500" /> Delivery Zones
          </Link>
          <Link
            to="/delivery/drivers"
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4 text-amber-500" /> Couriers
          </Link>
        </div>
      </div>

      {/* KPI Metrics */}
      {loadingMetrics ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading delivery fleet metrics...</p>
        </div>
      ) : metrics ? (
        <DeliveryMetricsCards metrics={metrics} />
      ) : null}

      {/* Live Dispatch Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Active Fulfillment Queue ({activeDeliveries.length})
          </h2>
          <Link
            to="/delivery/dispatch"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            View Full Dispatch Board <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loadingDeliveries ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading delivery orders...</p>
          </div>
        ) : (
          <DispatchTable
            deliveries={activeDeliveries.slice(0, 10)}
            onAssignDriver={handleOpenAssign}
            onPickup={handlePickup}
            onStart={handleStart}
            onComplete={handleComplete}
          />
        )}
      </div>

      {/* Driver Assignment Modal */}
      <AssignDriverModal
        delivery={selectedDelivery}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </div>
  );
};
