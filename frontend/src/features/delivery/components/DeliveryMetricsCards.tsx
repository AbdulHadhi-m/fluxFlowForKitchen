import React from 'react';
import { DeliveryMetrics } from '../types/delivery.types';
import { Truck, Send, CheckCircle2, XCircle, Users, Clock } from 'lucide-react';

interface DeliveryMetricsCardsProps {
  metrics: DeliveryMetrics;
}

export const DeliveryMetricsCards: React.FC<DeliveryMetricsCardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Ready for Dispatch */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Ready Dispatch</span>
          <Send className="w-4 h-4 text-cyan-400" />
        </div>
        <p className="text-2xl font-black text-white mt-2">{metrics.ready_for_dispatch_count}</p>
        <span className="text-[11px] text-cyan-400 font-medium">Awaiting driver</span>
      </div>

      {/* Out for Delivery */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Out for Delivery</span>
          <Truck className="w-4 h-4 text-amber-400" />
        </div>
        <p className="text-2xl font-black text-white mt-2">{metrics.out_for_delivery_count}</p>
        <span className="text-[11px] text-amber-400 font-medium">In transit</span>
      </div>

      {/* Pending / Preparing */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">In Kitchen</span>
          <Clock className="w-4 h-4 text-indigo-400" />
        </div>
        <p className="text-2xl font-black text-white mt-2">{metrics.pending_count}</p>
        <span className="text-[11px] text-indigo-400 font-medium">Prep queue</span>
      </div>

      {/* Available Drivers */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Couriers Online</span>
          <Users className="w-4 h-4 text-blue-400" />
        </div>
        <p className="text-2xl font-black text-white mt-2">
          {metrics.available_drivers_count} / {metrics.total_drivers_count}
        </p>
        <span className="text-[11px] text-blue-400 font-medium">Ready to assign</span>
      </div>

      {/* Completed Today */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Delivered Today</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-2xl font-black text-white mt-2">{metrics.completed_today_count}</p>
        <span className="text-[11px] text-emerald-400 font-medium">Successful orders</span>
      </div>

      {/* Failed Today */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Failed / Cancelled</span>
          <XCircle className="w-4 h-4 text-rose-400" />
        </div>
        <p className="text-2xl font-black text-white mt-2">{metrics.failed_today_count}</p>
        <span className="text-[11px] text-rose-400 font-medium">Exceptions</span>
      </div>
    </div>
  );
};
