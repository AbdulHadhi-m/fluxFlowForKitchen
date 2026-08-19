import React, { useState } from "react";
import { BusinessHour } from "../types/restaurant.types";
import { useRestaurant } from "../hooks/useRestaurant";
import { Can } from "@/features/authorization/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Save, Loader2, CheckCircle2, AlertCircle, Moon } from "lucide-react";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const BusinessHoursForm: React.FC<{ initialHours?: BusinessHour[] }> = ({
  initialHours = [],
}) => {
  const { updateBusinessHours, isUpdatingHours } = useRestaurant();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize state for 7 days
  const [hours, setHours] = useState<BusinessHour[]>(() => {
    return Array.from({ length: 7 }, (_, day) => {
      const existing = initialHours.find((h) => h.day_of_week === day);
      return (
        existing || {
          day_of_week: day,
          opening_time: "09:00:00",
          closing_time: "22:00:00",
          is_closed: false,
          is_overnight: false,
        }
      );
    });
  });

  const handleChange = (dayIndex: number, field: keyof BusinessHour, value: any) => {
    setHours((prev) =>
      prev.map((item, idx) => (idx === dayIndex ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateBusinessHours(hours);
      setSuccessMessage("Weekly operating hours saved successfully!");
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message || "Failed to update business operating hours."
      );
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-emerald-400" />
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
            Weekly Operating Schedule
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Configure daily service times for dining floor, kitchen stations, and takeaway orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {hours.map((hour, idx) => (
              <div
                key={hour.day_of_week}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="w-28 font-medium text-slate-700 dark:text-slate-200">
                  {DAY_NAMES[hour.day_of_week]}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={hour.is_closed}
                      onChange={(e) => handleChange(idx, "is_closed", e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-blue-600 focus:ring-0"
                    />
                    <span className={hour.is_closed ? "text-rose-400 font-medium" : ""}>
                      Closed All Day
                    </span>
                  </label>

                  {!hour.is_closed && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Open:</span>
                        <Input
                          type="time"
                          value={hour.opening_time?.slice(0, 5) || "09:00"}
                          onChange={(e) => handleChange(idx, "opening_time", `${e.target.value}:00`)}
                          className="h-8 w-28 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Close:</span>
                        <Input
                          type="time"
                          value={hour.closing_time?.slice(0, 5) || "22:00"}
                          onChange={(e) => handleChange(idx, "closing_time", `${e.target.value}:00`)}
                          className="h-8 w-28 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                        />
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 dark:text-slate-400" title="Shift extends past midnight into next morning">
                        <input
                          type="checkbox"
                          checked={hour.is_overnight || false}
                          onChange={(e) => handleChange(idx, "is_overnight", e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-emerald-600 focus:ring-0"
                        />
                        <Moon className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[11px]">Overnight</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 flex justify-end">
            <Can
              permission="settings.update"
              fallback={
                <Button disabled size="sm" className="opacity-50 text-xs">
                  Read Only
                </Button>
              }
            >
              <Button
                type="submit"
                disabled={isUpdatingHours}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs shadow-md shadow-emerald-600/20"
              >
                {isUpdatingHours ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving Hours...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Save Operating Hours
                  </>
                )}
              </Button>
            </Can>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
