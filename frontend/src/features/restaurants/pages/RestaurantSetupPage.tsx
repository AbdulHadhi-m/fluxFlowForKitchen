import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useRestaurant } from "../hooks/useRestaurant";
import { RestaurantProfileForm } from "../components/RestaurantProfileForm";
import { BusinessHoursForm } from "../components/BusinessHoursForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, ArrowLeft, Loader2 } from "lucide-react";

export const RestaurantSetupPage: React.FC = () => {
  const { restaurant, isLoading } = useRestaurant();
  const [activeTab, setActiveTab] = useState<"profile" | "hours">("profile");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 gap-3 transition-colors duration-200">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="text-xs text-slate-500 font-mono">Loading Restaurant Configuration...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-12 selection:bg-blue-500/30 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {restaurant?.name || "Restaurant Organization Setup"}
                <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 bg-blue-500/10 py-0">
                  Tenant Root
                </Badge>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure primary enterprise coordinates, localization standards, and weekly service hours.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              Slug: <span className="text-slate-600 dark:text-slate-300 font-semibold">{restaurant?.slug || "unregistered"}</span>
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === "profile"
                ? "bg-blue-600/20 text-blue-600 dark:text-blue-300 border border-blue-500/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" /> General Identity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("hours")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === "hours"
                ? "bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Operating Schedule
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && <RestaurantProfileForm restaurant={restaurant} />}
        {activeTab === "hours" && <BusinessHoursForm initialHours={restaurant?.business_hours} />}
      </div>
    </div>
  );
};
