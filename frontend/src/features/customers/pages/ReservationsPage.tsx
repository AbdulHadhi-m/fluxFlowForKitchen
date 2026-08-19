import React, { useState } from "react";
import { useReservations } from "../hooks/useReservations";
import { useCustomers } from "../hooks/useCustomers";
import { ReservationListTable } from "../components/ReservationListTable";
import { CreateReservationModal } from "../components/CreateReservationModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Calendar, CalendarPlus } from "lucide-react";

export const ReservationsPage: React.FC = () => {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    reservations,
    isLoadingReservations,
    createReservation,
    isCreatingReservation,
    updateStatus,
  } = useReservations(selectedDate);

  const { customers } = useCustomers();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title="Table Reservations & Bookings"
        description="Schedule dining reservations, assign tables, and manage guest check-ins."
        icon={Calendar}
        actions={
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Book Reservation
          </Button>
        }
      />

      {/* Date Filter */}
      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Reservation Date</label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 w-44"
          />
        </div>
      </div>

      {/* Reservations Table */}
      {isLoadingReservations ? (
        <LoadingState message="Loading reservations..." />
      ) : (
        <ReservationListTable
          reservations={reservations}
          onUpdateStatus={(id, status) => updateStatus({ id, status })}
        />
      )}

      {/* Booking Modal */}
      <CreateReservationModal
        isOpen={isModalOpen}
        customers={customers}
        onClose={() => setIsModalOpen(false)}
        onSubmit={createReservation}
        isLoading={isCreatingReservation}
      />
    </div>
  );
};
