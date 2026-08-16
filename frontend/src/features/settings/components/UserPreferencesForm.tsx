import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserPreference } from "../types/settings.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Palette, Clock, LayoutGrid } from "lucide-react";

const preferenceSchema = z.object({
  theme: z.enum(["DARK", "LIGHT", "SYSTEM"]),
  time_format: z.enum(["12H", "24H"]),
  table_density: z.enum(["COMPACT", "COMFORTABLE"]),
});

type PreferenceFormData = z.infer<typeof preferenceSchema>;

interface UserPreferencesFormProps {
  initialData?: UserPreference;
  onSubmit: (data: Partial<UserPreference>) => Promise<any>;
  isLoading?: boolean;
}

export const UserPreferencesForm: React.FC<UserPreferencesFormProps> = ({
  initialData,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<PreferenceFormData>({
    resolver: zodResolver(preferenceSchema),
    defaultValues: {
      theme: initialData?.theme ?? "DARK",
      time_format: initialData?.time_format ?? "12H",
      table_density: initialData?.table_density ?? "COMFORTABLE",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Palette className="h-4 w-4 text-indigo-400" />
            Display & UI Preferences
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Personalize your local dashboard theme, clock display, and grid spacing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Palette className="h-3 w-3 text-slate-400" /> Theme Mode
              </label>
              <select
                {...register("theme")}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="DARK">Dark Theme (Default)</option>
                <option value="LIGHT">Light Theme</option>
                <option value="SYSTEM">System Preference</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" /> Time Display Format
              </label>
              <select
                {...register("time_format")}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="12H">12-Hour (e.g. 02:30 PM)</option>
                <option value="24H">24-Hour (e.g. 14:30)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <LayoutGrid className="h-3 w-3 text-slate-400" /> Grid Density
              </label>
              <select
                {...register("table_density")}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="COMFORTABLE">Comfortable Spacing</option>
                <option value="COMPACT">High-Density Compact</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isLoading || !isDirty}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-indigo-600/20"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save User Preferences
        </Button>
      </div>
    </form>
  );
};
