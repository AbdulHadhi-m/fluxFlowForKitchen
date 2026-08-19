import React from "react";
import { NotificationItem as NotificationItemType } from "../types/notifications.types";
import { NotificationSeverityBadge } from "./NotificationSeverityBadge";
import { Boxes, ShoppingCart, UtensilsCrossed, Receipt, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NotificationItemProps {
  notification: NotificationItemType;
  onMarkRead: (id: string) => Promise<any>;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
}) => {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (notification.notification_type) {
      case "INVENTORY_LOW_STOCK":
      case "INVENTORY_OUT_OF_STOCK":
        return <Boxes className="h-4 w-4 text-amber-400" />;
      case "PURCHASE_ORDER_PENDING":
      case "PURCHASE_ORDER_APPROVED":
      case "PURCHASE_ORDER_PARTIALLY_RECEIVED":
      case "PURCHASE_ORDER_RECEIVED":
        return <ShoppingCart className="h-4 w-4 text-purple-400" />;
      case "ORDER_NEW":
      case "ORDER_CANCELLED":
      case "KDS_READY":
        return <UtensilsCrossed className="h-4 w-4 text-emerald-400" />;
      case "PAYMENT_COMPLETED":
        return <Receipt className="h-4 w-4 text-blue-400" />;
      default:
        return <Bell className="h-4 w-4 text-indigo-400" />;
    }
  };

  const handleClick = async () => {
    if (!notification.is_read) {
      await onMarkRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
        notification.is_read
          ? "bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-850 opacity-75"
          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 shadow-md"
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
            {getIcon()}
          </div>
          <div>
            <h4 className={`text-xs font-bold ${notification.is_read ? "text-slate-600 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}>
              {notification.title}
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              {new Date(notification.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <NotificationSeverityBadge severity={notification.severity} />
          {!notification.is_read && (
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 pl-9">
        {notification.message}
      </p>
    </div>
  );
};
