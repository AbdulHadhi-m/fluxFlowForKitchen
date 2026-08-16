import React from "react";
import { NotificationSeverity } from "../types/notifications.types";
import { Badge } from "@/components/ui/badge";
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

interface NotificationSeverityBadgeProps {
  severity: NotificationSeverity;
}

export const NotificationSeverityBadge: React.FC<NotificationSeverityBadgeProps> = ({ severity }) => {
  switch (severity) {
    case "INFO":
      return (
        <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] px-1.5 py-0.5 gap-1 font-bold">
          <Info className="h-2.5 w-2.5" /> Info
        </Badge>
      );
    case "SUCCESS":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-1.5 py-0.5 gap-1 font-bold">
          <CheckCircle2 className="h-2.5 w-2.5" /> Success
        </Badge>
      );
    case "WARNING":
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-1.5 py-0.5 gap-1 font-bold">
          <AlertTriangle className="h-2.5 w-2.5" /> Warning
        </Badge>
      );
    case "CRITICAL":
      return (
        <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] px-1.5 py-0.5 gap-1 font-bold animate-pulse">
          <AlertCircle className="h-2.5 w-2.5" /> Critical
        </Badge>
      );
    default:
      return null;
  }
};
