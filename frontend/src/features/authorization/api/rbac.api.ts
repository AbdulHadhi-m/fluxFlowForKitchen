import { apiClient } from "@/lib/api-client";
import { AuthContextResponse, SwitchRoleResponse, Role, Permission } from "../types/rbac.types";

export const rbacApi = {
  async getAuthContext(): Promise<AuthContextResponse> {
    const response = await apiClient.get<AuthContextResponse>("/auth/context/");
    return response.data;
  },

  async switchActiveRole(roleCodeOrId: string, tenantId?: string): Promise<SwitchRoleResponse> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleCodeOrId);
    const payload = {
      ...(isUuid ? { role_id: roleCodeOrId } : { role_code: roleCodeOrId }),
      ...(tenantId ? { tenant_id: tenantId } : {}),
    };
    const response = await apiClient.post<SwitchRoleResponse>("/auth/switch-role/", payload);
    return response.data;
  },

  async getRoles(): Promise<{ success: boolean; data: Role[] }> {
    const response = await apiClient.get<{ success: boolean; data: Role[] }>("/rbac/roles/");
    return response.data;
  },

  async getPermissions(): Promise<{ success: boolean; data: Permission[] }> {
    const response = await apiClient.get<{ success: boolean; data: Permission[] }>("/rbac/permissions/");
    return response.data;
  },
};
