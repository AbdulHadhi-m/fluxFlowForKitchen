import React, { useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { OperationalPoliciesForm } from "../components/OperationalPoliciesForm";
import { UserPreferencesForm } from "../components/UserPreferencesForm";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Sliders,
  User,
  Loader2,
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"OPERATIONAL" | "PREFERENCES">("OPERATIONAL");

  const {
    operational,
    isLoadingOperational,
    preferences,
    isLoadingPreferences,
    updateOperational,
    isUpdatingOperational,
    updatePreferences,
    isUpdatingPreferences,
  } = useSettings();

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Settings className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">System Settings & Configuration</h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure restaurant operational rules, tax rates, KDS timers, and personal dashboard preferences.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
        <Button
          variant={activeTab === "OPERATIONAL" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("OPERATIONAL")}
          className={`h-8 px-3 text-xs rounded-lg font-medium gap-1.5 transition-all ${
            activeTab === "OPERATIONAL"
              ? "bg-indigo-600 text-white font-bold shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" /> Operational Policies & Taxes
        </Button>

        <Button
          variant={activeTab === "PREFERENCES" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("PREFERENCES")}
          className={`h-8 px-3 text-xs rounded-lg font-medium gap-1.5 transition-all ${
            activeTab === "PREFERENCES"
              ? "bg-indigo-600 text-white font-bold shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/60"
          }`}
        >
          <User className="h-3.5 w-3.5" /> User Preferences
        </Button>
      </div>

      {/* Tab Contents */}
      {activeTab === "OPERATIONAL" && (
        isLoadingOperational ? (
          <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            Loading operational settings...
          </div>
        ) : (
          <OperationalPoliciesForm
            initialData={operational}
            onSubmit={updateOperational}
            isLoading={isUpdatingOperational}
          />
        )
      )}

      {activeTab === "PREFERENCES" && (
        isLoadingPreferences ? (
          <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            Loading user preferences...
          </div>
        ) : (
          <UserPreferencesForm
            initialData={preferences}
            onSubmit={updatePreferences}
            isLoading={isUpdatingPreferences}
          />
        )
      )}
    </div>
  );
};
