import React, { useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationItem } from "../components/NotificationItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell,
  CheckCheck,
  Filter,
  Loader2,
} from "lucide-react";

export const NotificationCenterPage: React.FC = () => {
  const [readFilter, setReadFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("");

  const isReadParam = readFilter === "UNREAD" ? false : readFilter === "READ" ? true : undefined;

  const {
    notifications,
    isLoadingNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useNotifications(isReadParam, severityFilter || undefined);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bell className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Notification Center</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Centralized operational notices, inventory threshold triggers, and real-time restaurant alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllRead}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-600/20"
          >
            {isMarkingAllRead ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          {["ALL", "UNREAD", "READ"].map((status) => (
            <Button
              key={status}
              variant={readFilter === status ? "default" : "ghost"}
              size="sm"
              onClick={() => setReadFilter(status)}
              className={`h-7 px-3 text-xs rounded-lg font-medium transition-all ${
                readFilter === status
                  ? "bg-indigo-600 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warnings</option>
            <option value="INFO">Info</option>
            <option value="SUCCESS">Success</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
        <CardContent className="p-4 space-y-2">
          {isLoadingNotifications ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Loading notification logs...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No notifications found matching your filters.
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={markAsRead}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
