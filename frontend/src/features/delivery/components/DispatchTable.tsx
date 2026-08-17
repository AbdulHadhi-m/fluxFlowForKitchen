import React from 'react';
import { Link } from 'react-router-dom';
import { DeliveryListItem } from '../types/delivery.types';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import {
  Truck,
  UserPlus,
  ArrowUpRight,
  MapPin,
  Phone,
  CheckCircle2,
  Package,
} from 'lucide-react';

interface DispatchTableProps {
  deliveries: DeliveryListItem[];
  onAssignDriver: (delivery: DeliveryListItem) => void;
  onPickup: (deliveryId: string) => void;
  onStart: (deliveryId: string) => void;
  onComplete: (deliveryId: string) => void;
}

export const DispatchTable: React.FC<DispatchTableProps> = ({
  deliveries,
  onAssignDriver,
  onPickup,
  onStart,
  onComplete,
}) => {
  if (deliveries.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
        <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">No Deliveries Found</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          There are currently no active delivery fulfillment orders matching the current filter.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-4 px-5">Order</th>
              <th className="py-4 px-5">Customer & Address</th>
              <th className="py-4 px-5">Zone / Fee</th>
              <th className="py-4 px-5">Status</th>
              <th className="py-4 px-5">Assigned Courier</th>
              <th className="py-4 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
            {deliveries.map((d) => (
              <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                {/* Order Number & Total */}
                <td className="py-4 px-5 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/delivery/${d.id}`}
                      className="font-bold text-amber-400 hover:underline flex items-center gap-1"
                    >
                      #{d.order_number}
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <span className="text-[11px] font-extrabold text-white">${d.order_total}</span>
                </td>

                {/* Customer & Address */}
                <td className="py-4 px-5">
                  <p className="font-bold text-white">{d.recipient_name}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    {d.address_line_1}, {d.city} ({d.postal_code})
                  </p>
                  {d.recipient_phone && (
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {d.recipient_phone}
                    </p>
                  )}
                </td>

                {/* Zone & Fee */}
                <td className="py-4 px-5 whitespace-nowrap">
                  <span className="font-medium text-slate-200">{d.zone_name || 'Standard'}</span>
                  <p className="text-[11px] text-slate-400">${d.delivery_fee} fee</p>
                </td>

                {/* Status */}
                <td className="py-4 px-5 whitespace-nowrap">
                  <DeliveryStatusBadge status={d.status} />
                </td>

                {/* Courier */}
                <td className="py-4 px-5 whitespace-nowrap">
                  {d.driver_name ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      {d.driver_name}
                    </span>
                  ) : (
                    <button
                      onClick={() => onAssignDriver(d)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Assign Driver
                    </button>
                  )}
                </td>

                {/* Actions */}
                <td className="py-4 px-5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    {d.status === 'READY_FOR_DISPATCH' && !d.assigned_driver && (
                      <button
                        onClick={() => onAssignDriver(d)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
                      >
                        Assign
                      </button>
                    )}

                    {d.status === 'ASSIGNED' && (
                      <button
                        onClick={() => onPickup(d.id)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors"
                      >
                        Mark Picked Up
                      </button>
                    )}

                    {d.status === 'PICKED_UP' && (
                      <button
                        onClick={() => onStart(d.id)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-colors"
                      >
                        Start Delivery
                      </button>
                    )}

                    {d.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() => onComplete(d.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </button>
                    )}

                    <Link
                      to={`/delivery/${d.id}`}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
