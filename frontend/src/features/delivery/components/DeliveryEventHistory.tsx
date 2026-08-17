import React from 'react';
import { DeliveryEvent } from '../types/delivery.types';
import { History } from 'lucide-react';

interface DeliveryEventHistoryProps {
  events: DeliveryEvent[];
}

export const DeliveryEventHistory: React.FC<DeliveryEventHistoryProps> = ({ events }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
        <History className="w-4 h-4 text-amber-500" /> Operational Event History
      </h3>

      {events.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-6">No events recorded yet.</p>
      ) : (
        <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {events.map((evt) => (
            <div key={evt.id} className="flex items-start gap-4 relative pl-8">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute left-[7px] top-1.5 ring-4 ring-slate-900" />
              <div className="flex-1 bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {evt.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(evt.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {evt.notes && <p className="text-xs text-slate-300 mt-1">{evt.notes}</p>}
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Actor: <span className="text-slate-300 font-semibold">{evt.actor_name}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
