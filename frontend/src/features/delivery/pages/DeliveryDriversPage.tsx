import React from 'react';
import { useDeliveryDrivers, useDriverAvailabilityMutation } from '../hooks/useDelivery';
import { DriverAvailability, VehicleType } from '../types/delivery.types';
import {
  Users,
  Bike,
  Car,
  Footprints,
  Loader2,
} from 'lucide-react';

export const DeliveryDriversPage: React.FC = () => {
  const { data: drivers = [], isLoading } = useDeliveryDrivers();
  const availabilityMutation = useDriverAvailabilityMutation();

  const handleToggleAvailability = (driverId: string, currentStatus: DriverAvailability) => {
    const nextStatus: DriverAvailability =
      currentStatus === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    availabilityMutation.mutate({ driverId, status: nextStatus });
  };

  const getVehicleIcon = (type: VehicleType) => {
    switch (type) {
      case 'CAR':
        return <Car className="w-5 h-5 text-blue-400" />;
      case 'BICYCLE':
      case 'BIKE':
        return <Bike className="w-5 h-5 text-amber-400" />;
      default:
        return <Footprints className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-amber-500" /> Courier Fleet Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor active couriers, shift availability status, vehicles, and delivery performance
          </p>
        </div>
      </div>

      {/* Drivers List */}
      {isLoading ? (
        <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading delivery fleet couriers...</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Delivery Couriers Assigned</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Assign staff members to the "DELIVERY_DRIVER" role under Staff Management to register them in the courier fleet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d) => (
            <div
              key={d.id}
              className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                    {getVehicleIcon(d.vehicle_type)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{d.full_name}</h3>
                    <p className="text-xs text-slate-400">{d.employee_id} • {d.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle</span>
                  <span className="font-semibold text-slate-300">
                    {d.vehicle_type} {d.vehicle_number && `(${d.vehicle_number})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-semibold text-slate-300">{d.phone || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Deliveries</span>
                  <span className="font-bold text-amber-400">{d.active_deliveries_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Completed</span>
                  <span className="font-bold text-emerald-400">{d.total_completed_deliveries}</span>
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    d.availability_status === 'AVAILABLE'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : d.availability_status === 'BUSY'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {d.availability_status}
                </span>

                <button
                  onClick={() => handleToggleAvailability(d.id, d.availability_status)}
                  disabled={d.availability_status === 'BUSY' || availabilityMutation.isPending}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-50 transition-colors"
                >
                  {d.availability_status === 'AVAILABLE' ? 'Set Offline' : 'Set Available'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
