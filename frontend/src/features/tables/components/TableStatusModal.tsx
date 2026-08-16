import React, { useState } from "react";
import { RestaurantTable, TableStatus } from "../types/table.types";
import { useTables } from "../hooks/useTables";
import { Button } from "@/components/ui/button";
import { X, Loader2, CheckCircle2, Clock, AlertCircle, Ban } from "lucide-react";

interface TableStatusModalProps {
  table: RestaurantTable | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: { status: TableStatus; label: string; description: string; icon: React.FC<{ className?: string }> }[] = [
  {
    status: "AVAILABLE",
    label: "Available",
    description: "Table is clean, sanitized, and ready for new guests.",
    icon: CheckCircle2,
  },
  {
    status: "OCCUPIED",
    label: "Occupied",
    description: "Guests seated and dining.",
    icon: Clock,
  },
  {
    status: "RESERVED",
    label: "Reserved",
    description: "Held for an upcoming customer booking.",
    icon: AlertCircle,
  },
  {
    status: "OUT_OF_SERVICE",
    label: "Out of Service",
    description: "Unavailable due to maintenance or event setup.",
    icon: Ban,
  },
];

export const TableStatusModal: React.FC<TableStatusModalProps> = ({ table, isOpen, onClose }) => {
  const { updateStatus, isUpdatingStatus } = useTables();
  const [selectedStatus, setSelectedStatus] = useState<TableStatus>(
    table?.status || "AVAILABLE"
  );

  React.useEffect(() => {
    if (table) {
      setSelectedStatus(table.status);
    }
  }, [table]);

  if (!isOpen || !table) return null;

  const handleSave = async () => {
    try {
      await updateStatus({ id: table.id, status: selectedStatus });
      onClose();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white">
              Update Table Status &bull; {table.name}
            </h3>
            <p className="text-xs text-slate-400">Section: {table.section || "Main Dining"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedStatus === opt.status;
            return (
              <button
                key={opt.status}
                type="button"
                onClick={() => setSelectedStatus(opt.status)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-blue-600/15 border-blue-500/40 text-white"
                    : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                <Icon
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    isSelected ? "text-blue-400" : "text-slate-400"
                  }`}
                />
                <div>
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[11px] text-slate-400">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-800 hover:bg-slate-800 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isUpdatingStatus}
            onClick={handleSave}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 shadow-md shadow-blue-600/20"
          >
            {isUpdatingStatus ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Updating...
              </>
            ) : (
              "Apply Status"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
