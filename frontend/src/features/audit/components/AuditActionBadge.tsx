import React from "react";
import { AuditAction } from "../types/audit.types";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  AlertOctagon,
  Shield,
  CheckCircle2,
  Boxes,
  Download,
} from "lucide-react";

interface AuditActionBadgeProps {
  action: AuditAction;
}

export const AuditActionBadge: React.FC<AuditActionBadgeProps> = ({ action }) => {
  switch (action) {
    case "CREATE":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-1.5 py-0.2 gap-1 font-bold">
          <PlusCircle className="h-2.5 w-2.5" /> Create
        </Badge>
      );
    case "UPDATE":
      return (
        <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-1.5 py-0.2 gap-1 font-bold">
          <Edit className="h-2.5 w-2.5" /> Update
        </Badge>
      );
    case "DELETE":
    case "CANCELLED":
      return (
        <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] px-1.5 py-0.2 gap-1 font-bold">
          <Trash2 className="h-2.5 w-2.5" /> {action}
        </Badge>
      );
    case "LOGIN":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-1.5 py-0.2 gap-1 font-bold">
          <LogIn className="h-2.5 w-2.5" /> Login
        </Badge>
      );
    case "LOGOUT":
      return (
        <Badge className="bg-slate-700/30 text-slate-400 border border-slate-700 text-[10px] px-1.5 py-0.2 gap-1 font-bold">
          <LogOut className="h-2.5 w-2.5" /> Logout
        </Badge>
      );
    case "LOGIN_FAILED":
      return (
        <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.2 gap-1 font-bold animate-pulse">
          <AlertOctagon className="h-2.5 w-2.5" /> Failed Login
        </Badge>
      );
    case "ROLE_CHANGED":
    case "PERMISSION_CHANGED":
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-1.5 py-0.2 gap-1 font-bold">
          <Shield className="h-2.5 w-2.5" /> {action.replace("_", " ")}
        </Badge>
      );
    case "APPROVED":
    case "PAYMENT_COMPLETED":
      return (
        <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] px-1.5 py-0.2 gap-1 font-bold">
          <CheckCircle2 className="h-2.5 w-2.5" /> {action.replace("_", " ")}
        </Badge>
      );
    case "STOCK_ADJUSTED":
    case "STOCK_RECEIVED":
    case "STOCK_WASTED":
      return (
        <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-1.5 py-0.2 gap-1 font-bold">
          <Boxes className="h-2.5 w-2.5" /> {action.replace("_", " ")}
        </Badge>
      );
    case "EXPORT":
      return (
        <Badge className="bg-slate-500/10 text-slate-300 border border-slate-500/20 text-[10px] px-1.5 py-0.2 gap-1 font-bold">
          <Download className="h-2.5 w-2.5" /> Export
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.2">
          {action}
        </Badge>
      );
  }
};
