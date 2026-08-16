import React from "react";
import { useMenu } from "../hooks/useMenu";
import { MenuItem } from "../types/menu.types";
import { Can } from "@/features/authorization/components/Can";
import { Loader2, Check, Ban } from "lucide-react";

interface AvailabilityToggleProps {
  item: MenuItem;
}

export const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({ item }) => {
  const { toggleAvailability, isTogglingAvailability } = useMenu();

  const handleToggle = async () => {
    try {
      await toggleAvailability({ id: item.id, is_available: !item.is_available });
    } catch (err) {
      console.error("Failed to toggle availability", err);
    }
  };

  return (
    <Can
      permission="menu.availability.manage"
      fallback={
        item.is_available ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <Check className="h-3 w-3" /> Available
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400">
            <Ban className="h-3 w-3" /> 86'd / Sold Out
          </span>
        )
      }
    >
      <button
        type="button"
        disabled={isTogglingAvailability}
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
          item.is_available
            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
            : "bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20"
        }`}
        title="Click to toggle floor and kitchen ordering availability"
      >
        {isTogglingAvailability ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : item.is_available ? (
          <>
            <Check className="h-3 w-3 text-emerald-400" />
            <span>Available</span>
          </>
        ) : (
          <>
            <Ban className="h-3 w-3 text-rose-400" />
            <span>86'd / Sold Out</span>
          </>
        )}
      </button>
    </Can>
  );
};
