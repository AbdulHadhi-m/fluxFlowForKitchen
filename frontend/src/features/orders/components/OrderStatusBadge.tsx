import React from "react";
import { OrderStatus } from "../types/order.types";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, FileText } from "lucide-react";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }
> = {
  DRAFT: {
    label: "Draft",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
    icon: FileText,
  },
  PLACED: {
    label: "Placed",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    icon: Clock,
  },
  COMPLETED: {
    label: "Completed",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    icon: XCircle,
  },
};

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PLACED;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium inline-flex items-center gap-1 py-0.5 px-2 ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {config.label}
    </Badge>
  );
};
