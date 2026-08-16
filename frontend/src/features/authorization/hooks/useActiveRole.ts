import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rbacApi } from "../api/rbac.api";
import { useRoleStore } from "../store/roleStore";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useActiveRole = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { activeRole, availableRoles, permissions, tenantId, setRoleContext, clearRoleContext } =
    useRoleStore();

  // Query authorization context when authenticated
  const contextQuery = useQuery({
    queryKey: ["authContext"],
    queryFn: () => rbacApi.getAuthContext(),
    enabled: isAuthenticated,
  });

  // Sync context query result with Zustand store
  useEffect(() => {
    if (contextQuery.data?.success && contextQuery.data.data) {
      const { active_role, available_roles, permissions, membership } = contextQuery.data.data;
      setRoleContext(
        active_role,
        available_roles,
        permissions,
        membership?.tenant_id || null
      );
    } else if (isAuthenticated === false && activeRole) {
      clearRoleContext();
    }
  }, [contextQuery.data, isAuthenticated, activeRole, setRoleContext, clearRoleContext]);

  // Switch Role Mutation
  const switchRoleMutation = useMutation({
    mutationFn: (roleCodeOrId: string) => rbacApi.switchActiveRole(roleCodeOrId, tenantId || undefined),
    onSuccess: (res) => {
      if (res.success && res.data) {
        const { active_role, available_roles, permissions, tenant_id } = res.data;
        setRoleContext(active_role, available_roles, permissions, tenant_id);
        queryClient.invalidateQueries(); // Invalidate server queries to re-fetch with new role permissions
      }
    },
  });

  return {
    activeRole,
    availableRoles,
    permissions,
    tenantId,
    isLoadingContext: contextQuery.isLoading,
    switchRole: switchRoleMutation.mutateAsync,
    isSwitchingRole: switchRoleMutation.isPending,
    switchError: switchRoleMutation.error,
  };
};
