import React from "react";
import { usePermission, useHasAnyPermission, useHasAllPermissions } from "../hooks/usePermission";

interface CanProps {
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  anyPermissions,
  allPermissions,
  fallback = null,
  children,
}) => {
  const hasSingle = usePermission(permission || "");
  const hasAny = useHasAnyPermission(anyPermissions || []);
  const hasAll = useHasAllPermissions(allPermissions || []);

  let allowed = false;
  if (permission) {
    allowed = hasSingle;
  } else if (anyPermissions && anyPermissions.length > 0) {
    allowed = hasAny;
  } else if (allPermissions && allPermissions.length > 0) {
    allowed = hasAll;
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
};
