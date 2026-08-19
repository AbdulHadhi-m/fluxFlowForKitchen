import React, { useState } from "react";
import { KitchenStatus } from "../types/kitchen.types";
import { useKitchenTickets } from "../hooks/useKitchenTickets";
import { useKitchenWebSocket } from "../hooks/useKitchenWebSocket";
import { KitchenHeader } from "../components/KitchenHeader";
import { KitchenTicketGrid } from "../components/KitchenTicketGrid";

export const KitchenDisplayPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<KitchenStatus | "">("");

  // Real-time WebSocket connection
  const { connectionStatus } = useKitchenWebSocket();

  // Authoritative TanStack Query tickets & mutations
  const {
    tickets,
    isLoading,
    startTicket,
    readyTicket,
    completeTicket,
    isStarting,
    isReadying,
    isCompleting,
  } = useKitchenTickets(statusFilter);

  const isUpdating = isStarting || isReadying || isCompleting;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-6 flex flex-col justify-between select-none transition-colors duration-200">
      <div className="max-w-7xl mx-auto w-full space-y-4 flex-1 flex flex-col">
        {/* Top KDS Header */}
        <KitchenHeader
          selectedStatus={statusFilter}
          onSelectStatus={setStatusFilter}
          connectionStatus={connectionStatus}
          activeCount={tickets.length}
        />

        {/* Live Ticket Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 space-y-3 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="h-8 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
                  <div className="h-8 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <KitchenTicketGrid
            tickets={tickets}
            onStart={startTicket}
            onReady={readyTicket}
            onComplete={completeTicket}
            isUpdating={isUpdating}
          />
        )}
      </div>
    </div>
  );
};
