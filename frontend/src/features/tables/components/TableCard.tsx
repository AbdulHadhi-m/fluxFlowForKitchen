import React from "react";
import { RestaurantTable, TableStatus } from "../types/table.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/features/authorization/components/Can";
import { Users, Edit2, CheckCircle2, Clock, Ban, AlertCircle, RefreshCw } from "lucide-react";

interface TableCardProps {
  table: RestaurantTable;
  onEdit: (table: RestaurantTable) => void;
  onStatusClick: (table: RestaurantTable) => void;
}

const STATUS_CONFIG: Record<
  TableStatus,
  { label: string; bg: string; text: string; border: string; bar: string; icon: React.FC<{ className?: string }> }
> = {
  AVAILABLE: {
    label: "Available",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-300",
    border: "border-emerald-500/30",
    bar: "from-emerald-500 to-teal-400",
    icon: CheckCircle2,
  },
  OCCUPIED: {
    label: "Occupied",
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-500/30",
    bar: "from-teal-500 to-emerald-400",
    icon: Clock,
  },
  RESERVED: {
    label: "Reserved",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-300",
    border: "border-amber-500/30",
    bar: "from-amber-500 to-orange-400",
    icon: AlertCircle,
  },
  OUT_OF_SERVICE: {
    label: "Out of Service",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-300",
    border: "border-rose-500/30",
    bar: "from-rose-500 to-pink-400",
    icon: Ban,
  },
};

export const TableCard: React.FC<TableCardProps> = ({ table, onEdit, onStatusClick }) => {
  const statusInfo = STATUS_CONFIG[table.status] || STATUS_CONFIG.AVAILABLE;
  const StatusIcon = statusInfo.icon;

  return (
    <div
      className={`card-lift relative overflow-hidden rounded-2xl border ${statusInfo.border} bg-white dark:bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between gap-3`}
    >
      {/* Status accent bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${statusInfo.bar}`} />

      <div className="p-4 pt-3 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight">
              {table.name}
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {table.section || "Main Dining"}
            </span>
          </div>

          <Badge variant="outline" className="text-[11px] border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-300 gap-1">
            <Users className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            {table.capacity}
          </Badge>
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-auto">
          <button
            type="button"
            onClick={() => onStatusClick(table)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} hover:brightness-110 active:scale-95 transition-all`}
            title="Click to update table occupancy status"
          >
            <StatusIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{statusInfo.label}</span>
            <RefreshCw className="h-2.5 w-2.5 opacity-60 ml-0.5" />
          </button>

          <Can permission="tables.update">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(table)}
              className="h-7 w-7 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
              title="Edit table configuration"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </Can>
        </div>
      </div>
    </div>
  );
};