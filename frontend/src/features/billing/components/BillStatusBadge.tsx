import React from "react";
import { BillStatus } from "../types/billing.types";
import { Badge } from "@/components/ui/badge";

interface BillStatusBadgeProps {
  status: BillStatus;
}

export const BillStatusBadge: React.FC<BillStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case "DRAFT":
      return (
        <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">
          Draft
        </Badge>
      );
    case "FINALIZED":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
          Unpaid
        </Badge>
      );
    case "PARTIALLY_PAID":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
          Partially Paid
        </Badge>
      );
    case "PAID":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          Paid
        </Badge>
      );
    case "VOID":
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30">
          Void
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
