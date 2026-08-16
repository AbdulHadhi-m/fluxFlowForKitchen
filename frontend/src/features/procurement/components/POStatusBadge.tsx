import React from "react";
import { POStatus } from "../types/procurement.types";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, CheckCircle2, Truck, CheckCheck, Ban } from "lucide-react";

interface POStatusBadgeProps {
  status: POStatus;
}

export const POStatusBadge: React.FC<POStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case "DRAFT":
      return (
        <Badge className="bg-slate-500/10 text-slate-400 border border-slate-500/20 font-bold gap-1 text-[11px] px-2 py-0.5">
          <FileText className="h-3 w-3" /> Draft
        </Badge>
      );
    case "SUBMITTED":
      return (
        <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold gap-1 text-[11px] px-2 py-0.5">
          <Send className="h-3 w-3" /> Submitted
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold gap-1 text-[11px] px-2 py-0.5">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    case "PARTIALLY_RECEIVED":
      return (
        <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold gap-1 text-[11px] px-2 py-0.5 animate-pulse">
          <Truck className="h-3 w-3" /> Partial Delivery
        </Badge>
      );
    case "RECEIVED":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold gap-1 text-[11px] px-2 py-0.5">
          <CheckCheck className="h-3 w-3" /> Fully Received
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold gap-1 text-[11px] px-2 py-0.5">
          <Ban className="h-3 w-3" /> Cancelled
        </Badge>
      );
    default:
      return null;
  }
};
