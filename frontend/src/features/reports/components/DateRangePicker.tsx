import React from "react";
import { DatePreset } from "../types/reports.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

interface DateRangePickerProps {
  preset: DatePreset;
  startDate?: string;
  endDate?: string;
  onPresetChange: (preset: DatePreset) => void;
  onCustomRangeChange: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onCustomRangeChange,
}) => {
  const presets: { id: DatePreset; label: string }[] = [
    { id: "TODAY", label: "Today" },
    { id: "YESTERDAY", label: "Yesterday" },
    { id: "LAST_7_DAYS", label: "Last 7 Days" },
    { id: "LAST_30_DAYS", label: "Last 30 Days" },
    { id: "THIS_MONTH", label: "This Month" },
    { id: "CUSTOM", label: "Custom" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {presets.map((p) => (
          <Button
            key={p.id}
            variant={preset === p.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onPresetChange(p.id)}
            className={`h-7 px-2.5 text-xs rounded-lg font-medium transition-all ${
              preset === p.id
                ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {preset === "CUSTOM" && (
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800 animate-in fade-in">
          <Calendar className="h-3.5 w-3.5 text-indigo-400" />
          <Input
            type="date"
            value={startDate || ""}
            onChange={(e) => onCustomRangeChange(e.target.value, endDate || "")}
            className="h-7 text-xs bg-slate-950 border-slate-700 text-slate-200 w-32"
          />
          <span className="text-slate-500 text-xs">to</span>
          <Input
            type="date"
            value={endDate || ""}
            onChange={(e) => onCustomRangeChange(startDate || "", e.target.value)}
            className="h-7 text-xs bg-slate-950 border-slate-700 text-slate-200 w-32"
          />
        </div>
      )}
    </div>
  );
};
