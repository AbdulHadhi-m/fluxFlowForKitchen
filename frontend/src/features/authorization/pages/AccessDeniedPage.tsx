import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveRole } from "../hooks/useActiveRole";

export const AccessDeniedPage: React.FC<{ requiredPermission?: string }> = ({
  requiredPermission,
}) => {
  const { activeRole } = useActiveRole();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100 selection:bg-rose-500/30 transition-colors duration-200">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 items-center justify-center text-rose-400 shadow-2xl mb-2">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">403 — Access Denied</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your current active role (<span className="text-rose-600 dark:text-rose-300 font-medium">{activeRole?.name || "Active Role"}</span>)
            does not possess the required permission to view this operational terminal.
          </p>
          {requiredPermission && (
            <div className="pt-2">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                Required: {requiredPermission}
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
