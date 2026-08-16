import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Customer, CreateReservationPayload } from "../types/customers.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarPlus, X } from "lucide-react";

const reservationSchema = z.object({
  customer: z.string().min(1, "Customer selection is required"),
  reservation_date: z.string().min(1, "Date is required"),
  reservation_time: z.string().min(1, "Time is required"),
  party_size: z.coerce.number().min(1, "Minimum 1 guest"),
  special_requests: z.string().optional(),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

interface CreateReservationModalProps {
  isOpen: boolean;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (data: CreateReservationPayload) => Promise<any>;
  isLoading?: boolean;
}

export const CreateReservationModal: React.FC<CreateReservationModalProps> = ({
  isOpen,
  customers,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      customer: customers[0]?.id || "",
      reservation_date: today,
      reservation_time: "19:00",
      party_size: 2,
      special_requests: "",
    },
  });

  if (!isOpen) return null;

  const handleFormSubmit = async (data: ReservationFormData) => {
    await onSubmit({
      customer: data.customer,
      reservation_date: data.reservation_date,
      reservation_time: data.reservation_time,
      party_size: data.party_size,
      special_requests: data.special_requests || "",
    });
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <CalendarPlus className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Book Table Reservation</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Customer *</label>
            <select
              {...register("customer")}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.phone})
                </option>
              ))}
            </select>
            {errors.customer && <span className="text-[10px] text-rose-400">{errors.customer.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Date *</label>
              <Input
                type="date"
                {...register("reservation_date")}
                className="bg-slate-950 border-slate-800 text-xs text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Time *</label>
              <Input
                type="time"
                {...register("reservation_time")}
                className="bg-slate-950 border-slate-800 text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Party Size (Guests) *</label>
            <Input
              type="number"
              {...register("party_size")}
              className="bg-slate-950 border-slate-800 text-xs text-slate-200"
            />
            {errors.party_size && <span className="text-[10px] text-rose-400">{errors.party_size.message}</span>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Special Notes & Seating Requests</label>
            <Input
              {...register("special_requests")}
              placeholder="e.g. Birthday celebration, window table"
              className="bg-slate-950 border-slate-800 text-xs text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Confirm Booking
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
