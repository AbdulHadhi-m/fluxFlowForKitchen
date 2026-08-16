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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col justify-between select-none">
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
          <div className="py-32 text-center text-slate-500 font-mono text-xs">
            Connecting & Loading Kitchen Feed...
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
