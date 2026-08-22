import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  ShieldAlert,
  Lock,
  Eye,
  Key,
} from "lucide-react";

export const PlatformImpersonationPage: React.FC = () => {
  const [selectedTenant, setSelectedTenant] = useState("The Olive Garden Bistro");
  const [activeSession, setActiveSession] = useState(false);
  const [breakGlassActive, setBreakGlassActive] = useState(false);
  const [justification, setJustification] = useState("");

  const handleStartSession = () => {
    setActiveSession(true);
  };

  const handleStopSession = () => {
    setActiveSession(false);
    setBreakGlassActive(false);
    setJustification("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-amber-500" />
            Tenant Support Impersonation Console
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            SaaS Owner responsibility: Troubleshoot customer issues in strict Read-Only Diagnostics mode.
          </p>
        </div>
        <div>
          <Badge
            variant="outline"
            className={`text-xs ${
              activeSession
                ? "text-amber-600 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-500/10"
                : "text-slate-500"
            }`}
          >
            {activeSession ? "Impersonation Active (Read-Only)" : "No Active Session"}
          </Badge>
        </div>
      </div>

      {/* Compliance & Restrictions Alert */}
      <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-amber-900 dark:text-amber-200">
              Impersonation Guardrails & Segregation of Duties
            </h3>
            <p className="text-amber-800 dark:text-amber-300/80 leading-relaxed">
              When impersonating a restaurant user, SaaS Owners are strictly restricted to <strong>Read-Only Diagnostics Mode</strong>. You cannot create customer orders, bump kitchen tickets, or process payments. Modifying operational records requires an explicit Break-Glass elevation with a mandatory support ticket ID.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Impersonation Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Session Starter */}
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
              Launch Diagnostic Session
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Select a restaurant tenant organization to inspect.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Target Restaurant Tenant
              </label>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                disabled={activeSession}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option>The Olive Garden Bistro (OLIVE_BISTRO)</option>
                <option>Saffron Spice Kitchen & Grill (SAFFRON_GRILL)</option>
                <option>Urban Crust Pizzeria (URBAN_CRUST)</option>
                <option>Royal Rajputana Fine Dining (ROYAL_RAJPUTANA)</option>
              </select>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Access Mode:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Read-Only Diagnostics</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Write Permissions:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">Locked / Disabled</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Max Session Time:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">60 minutes</span>
              </div>
            </div>

            <div className="pt-2">
              {!activeSession ? (
                <Button
                  onClick={handleStartSession}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 gap-2"
                >
                  <Eye className="h-4 w-4" /> Start Read-Only Inspection
                </Button>
              ) : (
                <Button
                  onClick={handleStopSession}
                  variant="destructive"
                  className="w-full text-xs h-9 gap-2"
                >
                  <Lock className="h-4 w-4" /> Terminate Impersonation Session
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Elevated Break-Glass Writes */}
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-rose-500" />
                Break-Glass Write Elevation
              </CardTitle>
              <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300 dark:border-rose-800">
                Audited
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Only for critical data corruption repair. Every action is logged to immutable audit records.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Support Ticket ID & Justification (Required)
              </label>
              <input
                type="text"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="e.g. TICKET-9921: Fix corrupted recipe ingredient linking"
                disabled={!activeSession || breakGlassActive}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Elevated write mode unlocks emergency modification of tenant configurations. Live order creation and payment processing remain permanently disabled.
            </p>

            <div className="pt-2">
              <Button
                onClick={() => setBreakGlassActive(!breakGlassActive)}
                disabled={!activeSession || !justification.trim()}
                variant={breakGlassActive ? "destructive" : "outline"}
                className="w-full text-xs h-9 gap-2 border-rose-300 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <ShieldAlert className="h-4 w-4" />
                {breakGlassActive ? "Revoke Write Elevation" : "Request Break-Glass Write Grant"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
