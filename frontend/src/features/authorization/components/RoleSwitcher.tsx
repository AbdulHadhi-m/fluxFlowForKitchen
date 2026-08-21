import React, { useState } from "react";
import { useActiveRole } from "../hooks/useActiveRole";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ChevronDown, Check, Loader2, Sparkles } from "lucide-react";

export const RoleSwitcher: React.FC = () => {
  const { activeRole, availableRoles, switchRole, isSwitchingRole } = useActiveRole();
  const [isOpen, setIsOpen] = useState(false);

  if (!availableRoles || availableRoles.length <= 1) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-xs">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>{activeRole?.name || activeRole?.code || "Default Role"}</span>
      </div>
    );
  }

  const handleSelectRole = async (roleCode: string) => {
    if (roleCode === activeRole?.code) {
      setIsOpen(false);
      return;
    }
    try {
      await switchRole(roleCode);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to switch active role", err);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <Button
        variant="outline"
        size="sm"
        disabled={isSwitchingRole}
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-2.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2"
      >
        {isSwitchingRole ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        )}
        <span className="font-semibold text-slate-900 dark:text-white">
          {activeRole?.name || activeRole?.code || "Select Role"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 ml-1" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-1.5 space-y-1 text-xs">
            <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              Assigned Operational Roles
            </div>
            {availableRoles.map((role) => {
              const isSelected = role.code === activeRole?.code;
              return (
                <button
                  key={role.id}
                  type="button"
                  disabled={isSwitchingRole}
                  onClick={() => handleSelectRole(role.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                    isSelected
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900 dark:text-white">{role.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{role.code}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
