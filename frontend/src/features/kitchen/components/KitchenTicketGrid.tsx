import React from "react";
import { KitchenTicket } from "../types/kitchen.types";
import { KitchenOrderCard } from "./KitchenOrderCard";
import { ChefHat } from "lucide-react";

interface KitchenTicketGridProps {
  tickets: KitchenTicket[];
  onStart: (id: string) => Promise<any>;
  onReady: (id: string) => Promise<any>;
  onComplete: (id: string) => Promise<any>;
  isUpdating: boolean;
}

export const KitchenTicketGrid: React.FC<KitchenTicketGridProps> = ({
  tickets,
  onStart,
  onReady,
  onComplete,
  isUpdating,
}) => {
  if (tickets.length === 0) {
    return (
      <div className="py-28 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/30 flex-1 flex flex-col items-center justify-center">
        <ChefHat className="h-12 w-12 text-slate-700 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-300">Kitchen Pass is Clear</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No pending orders in the kitchen queue. Incoming tickets from POS will appear automatically in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
      {tickets.map((ticket) => (
        <KitchenOrderCard
          key={ticket.id}
          ticket={ticket}
          onStart={onStart}
          onReady={onReady}
          onComplete={onComplete}
          isUpdating={isUpdating}
        />
      ))}
    </div>
  );
};
