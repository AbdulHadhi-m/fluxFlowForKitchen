import React from "react";
import { Link } from "react-router-dom";
import { KitchenStatus, WsConnectionStatus } from "../types/kitchen.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChefHat,
  ArrowLeft,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";

interface KitchenHeaderProps {
  selectedStatus: KitchenStatus | "";
  onSelectStatus: (status: KitchenStatus | "") => void;
  connectionStatus: WsConnectionStatus;
  activeCount: number;
}

export const KitchenHeader: React.FC<KitchenHeaderProps> = ({
  selectedStatus,
  onSelectStatus,
  connectionStatus,
  activeCount,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Link to="/dashboard">
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0 border-slate-800 hover:bg-slate-900 text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-amber-400" />
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Kitchen Display System
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10 py-0">
                {activeCount} Active {activeCount === 1 ? "Ticket" : "Tickets"}
              </Badge>
            </h1>
          </div>
        </div>
      </div>

      {/* Center Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {[
          { label: "All Active", value: "" as const },
          { label: "New", value: "NEW" as const },
          { label: "Preparing", value: "PREPARING" as const },
          { label: "Ready", value: "READY" as const },
        ].map((tab) => {
          const isSelected = selectedStatus === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => onSelectStatus(tab.value)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Connection Indicator */}
      <div className="flex items-center gap-2">
        {connectionStatus === "CONNECTED" && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <Wifi className="h-3 w-3" /> Live Feed
          </span>
        )}
        {connectionStatus === "RECONNECTING" && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" /> Reconnecting
          </span>
        )}
        {connectionStatus === "OFFLINE" && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-full">
            <WifiOff className="h-3 w-3" /> Offline (Polling)
          </span>
        )}
      </div>
    </div>
  );
};
