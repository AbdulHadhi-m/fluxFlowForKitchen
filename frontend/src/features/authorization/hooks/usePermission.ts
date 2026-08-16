import { useRoleStore } from "../store/roleStore";

/**
 * Hook to check if current active role possesses a specific permission code.
 * @param requiredPermission e.g. "orders.create" or "billing.refund"
 * @returns boolean
 */
export const usePermission = (requiredPermission: string): boolean => {
  const permissions = useRoleStore((state) => state.permissions);
  return permissions.includes(requiredPermission);
};

/**
 * Check multiple permissions (AND / OR logic)
 */
export const useHasAnyPermission = (permissionsToCheck: string[]): boolean => {
  const permissions = useRoleStore((state) => state.permissions);
  return permissionsToCheck.some((p) => permissions.includes(p));
};

export const useHasAllPermissions = (permissionsToCheck: string[]): boolean => {
  const permissions = useRoleStore((state) => state.permissions);
  return permissionsToCheck.every((p) => permissions.includes(p));
};
