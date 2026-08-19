import React from "react";
import { Reservation } from "../types/customers.types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, CheckCircle, XCircle, LogIn } from "lucide-react";

interface ReservationListTableProps {
  reservations: Reservation[];
  onUpdateStatus: (id: string, status: string) => Promise<any>;
}

export const ReservationListTable: React.FC<ReservationListTableProps> = ({
  reservations,
  onUpdateStatus,
}) => {
  if (reservations.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-500 bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
        No table bookings scheduled for this date.
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="success">Confirmed</Badge>;
      case "CHECKED_IN":
        return <Badge variant="default" className="bg-blue-600 text-white">Checked In</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "NO_SHOW":
        return <Badge variant="destructive" className="bg-amber-600">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Reservation #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3 text-center">Party Size</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-200/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                    {r.reservation_number}
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    <div>{r.customer_name}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{r.customer_phone}</div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>{r.reservation_date}</span>
                      <Clock className="h-3.5 w-3.5 text-slate-500 ml-1" />
                      <span>{r.reservation_time}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3 text-slate-500" /> {r.party_size}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                    {r.table_name || <span className="text-slate-500 italic">Unassigned</span>}
                  </td>

                  <td className="px-4 py-3">{getStatusBadge(r.status)}</td>

                  <td className="px-4 py-3 text-right space-x-1.5">
                    {r.status === "CONFIRMED" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdateStatus(r.id, "CHECKED_IN")}
                          className="h-7 px-2 text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20"
                        >
                          <LogIn className="h-3 w-3 mr-1" /> Check In
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUpdateStatus(r.id, "CANCELLED")}
                          className="h-7 px-2 text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </>
                    )}
                    {r.status === "CHECKED_IN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus(r.id, "COMPLETED")}
                        className="h-7 px-2 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Complete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
