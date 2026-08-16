import React from "react";
import { usePermission } from "../hooks/usePermission";
import { AccessDeniedPage } from "../pages/AccessDeniedPage";
import { useAuthStore } from "@/features/auth/store/authStore";
import { Loader2 } from "lucide-react";

interface PermissionRouteProps {
  requiredPermission: string;
  children: React.ReactNode;
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  requiredPermission,
  children,
}) => {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const hasPermission = usePermission(requiredPermission);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="text-xs text-slate-500 font-mono">Evaluating Permissions...</span>
      </div>
    );
  }

  if (!hasPermission) {
    return <AccessDeniedPage requiredPermission={requiredPermission} />;
  }

  return <>{children}</>;
};
