import React from 'react';
import { DeliveryStatus } from '../types/delivery.types';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  size?: 'sm' | 'md';
}

export const DeliveryStatusBadge: React.FC<DeliveryStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'PENDING':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'PREPARING':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'READY_FOR_DISPATCH':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 animate-pulse';
      case 'ASSIGNED':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'PICKED_UP':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'OUT_FOR_DELIVERY':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      case 'DELIVERED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'FAILED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'CANCELLED':
        return 'bg-slate-800/80 text-slate-400 border-slate-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'READY_FOR_DISPATCH':
        return 'Ready for Dispatch';
      case 'OUT_FOR_DELIVERY':
        return 'Out for Delivery';
      case 'PICKED_UP':
        return 'Picked Up';
      default:
        return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
    }
  };

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border ${getBadgeStyle()} ${sizeClasses}`}
    >
      {getLabel()}
    </span>
  );
};
