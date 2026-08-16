import React from "react";
import { StockStatus } from "../types/inventory.types";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface StockStatusBadgeProps {
  status: StockStatus;
}

export const StockStatusBadge: React.FC<StockStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case "IN_STOCK":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold gap-1 text-[11px] px-2 py-0.5">
          <CheckCircle2 className="h-3 w-3" /> In Stock
        </Badge>
      );
    case "LOW_STOCK":
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold gap-1 text-[11px] px-2 py-0.5 animate-pulse">
          <AlertTriangle className="h-3 w-3" /> Low Stock
        </Badge>
      );
    case "OUT_OF_STOCK":
      return (
        <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold gap-1 text-[11px] px-2 py-0.5">
          <XCircle className="h-3 w-3" /> Out of Stock
        </Badge>
      );
    default:
      return null;
  }
};
