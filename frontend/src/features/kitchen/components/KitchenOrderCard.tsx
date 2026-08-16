import React, { useEffect, useState } from "react";
import { KitchenTicket } from "../types/kitchen.types";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Flame,
  CheckCircle2,
  Send,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface KitchenOrderCardProps {
  ticket: KitchenTicket;
  onStart: (id: string) => Promise<any>;
  onReady: (id: string) => Promise<any>;
  onComplete: (id: string) => Promise<any>;
  isUpdating: boolean;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({
  ticket,
  onStart,
  onReady,
  onComplete,
  isUpdating,
}) => {
  // Live elapsed minutes counter
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const created = new Date(ticket.created_at).getTime();
      const now = Date.now();
      const diffMins = Math.floor((now - created) / 60000);
      setElapsedMinutes(Math.max(0, diffMins));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [ticket.created_at]);

  // Card age styling
  const getAgeColor = () => {
    if (elapsedMinutes >= 20) return "text-rose-400 bg-rose-500/10 border-rose-500/30";
    if (elapsedMinutes >= 10) return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between shadow-xl backdrop-blur-sm transition-all hover:border-slate-700 min-h-[300px]">
      {/* Ticket Header */}
      <div>
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div>
            <div className="text-base font-black font-mono text-white tracking-wide flex items-center gap-1.5">
              {ticket.order_number}
            </div>
            <div className="text-xs font-bold text-blue-300">
              {ticket.table_name ? `Table ${ticket.table_name}` : "Takeaway / Direct"}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${getAgeColor()}`}
            >
              <Clock className="h-3 w-3" /> {elapsedMinutes} min
            </span>
            <span className="text-[10px] text-slate-500">
              Server: {ticket.server_name}
            </span>
          </div>
        </div>

        {/* Order-level note banner if present */}
        {ticket.notes && (
          <div className="my-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">Order Note: {ticket.notes}</span>
          </div>
        )}

        {/* Item Lines */}
        <div className="py-3 space-y-2.5 divide-y divide-slate-800/50">
          {ticket.items.map((item) => (
            <div key={item.id} className="pt-2 first:pt-0">
              <div className="flex items-start gap-2">
                <span className="h-6 w-6 rounded-md bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {item.quantity}
                </span>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-100 leading-tight">
                    {item.name}
                  </div>
                  {item.notes && (
                    <div className="text-[11px] text-amber-400 font-semibold italic mt-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded inline-block">
                      &bull; {item.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bump Bar Action Button */}
      <div className="pt-3 border-t border-slate-800">
        {ticket.status === "NEW" && (
          <Button
            type="button"
            disabled={isUpdating}
            onClick={() => onStart(ticket.id)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 h-10 shadow-lg shadow-blue-600/20 gap-2"
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
            START PREP
          </Button>
        )}

        {ticket.status === "PREPARING" && (
          <Button
            type="button"
            disabled={isUpdating}
            onClick={() => onReady(ticket.id)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 h-10 shadow-lg shadow-amber-500/20 gap-2"
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            MARK READY ON PASS
          </Button>
        )}

        {ticket.status === "READY" && (
          <Button
            type="button"
            disabled={isUpdating}
            onClick={() => onComplete(ticket.id)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 h-10 shadow-lg shadow-emerald-600/20 gap-2"
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            SERVE & CLEAR TICKET
          </Button>
        )}
      </div>
    </div>
  );
};
