import React, { useState } from 'react';
import { useDeliveryDrivers, useAssignDriverMutation } from '../hooks/useDelivery';
import { DeliveryListItem } from '../types/delivery.types';
import { X, UserCheck, Bike, Car, Footprints, Loader2, AlertCircle } from 'lucide-react';

interface AssignDriverModalProps {
  delivery: DeliveryListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AssignDriverModal: React.FC<AssignDriverModalProps> = ({
  delivery,
  isOpen,
  onClose,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const { data: drivers = [], isLoading: loadingDrivers } = useDeliveryDrivers();
  const assignMutation = useAssignDriverMutation();

  if (!isOpen || !delivery) return null;

  const handleAssign = async () => {
    if (!selectedDriverId) return;
    try {
      await assignMutation.mutateAsync({
        deliveryId: delivery.id,
        driverId: selectedDriverId,
      });
      onClose();
    } catch (err) {
      // Error handled in UI state
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'CAR':
        return <Car className="w-4 h-4 text-blue-400" />;
      case 'BICYCLE':
      case 'BIKE':
        return <Bike className="w-4 h-4 text-amber-400" />;
      default:
        return <Footprints className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assign Courier</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Order #{delivery.order_number} • {delivery.recipient_name}
            </p>
          </div>
        </div>

        {assignMutation.isError && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{(assignMutation.error as any)?.response?.data?.driver_id?.[0] || 'Assignment failed.'}</span>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {loadingDrivers ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> Loading drivers...
            </div>
          ) : drivers.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-6">No couriers registered yet.</p>
          ) : (
            drivers.map((driver) => {
              const isAvailable = driver.availability_status === 'AVAILABLE';
              const isSelected = selectedDriverId === driver.id;

              return (
                <div
                  key={driver.id}
                  onClick={() => isAvailable && setSelectedDriverId(driver.id)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    !isAvailable
                      ? 'opacity-50 cursor-not-allowed bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/50'
                      : isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      {getVehicleIcon(driver.vehicle_type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{driver.full_name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {driver.vehicle_type} {driver.vehicle_number && `(${driver.vehicle_number})`} • {driver.active_deliveries_count} active orders
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      isAvailable
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {driver.availability_status}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedDriverId || assignMutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {assignMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Confirm Assignment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
