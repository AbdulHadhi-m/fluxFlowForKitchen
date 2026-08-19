import { apiClient } from "@/lib/api-client";
import {
  AuthContextResponse,
  SwitchRoleResponse,
  Role,
  Permission,
  CreateRolePayload,
  UpdateRolePayload,
  TenantMembership,
  AssignMembershipRolesPayload,
} from "../types/rbac.types";

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

  async createRole(payload: CreateRolePayload): Promise<{ success: boolean; data: Role }> {
    const response = await apiClient.post<{ success: boolean; data: Role }>("/rbac/roles/", payload);
    return response.data;
  },

  async updateRole(roleId: string, payload: UpdateRolePayload): Promise<{ success: boolean; data: Role }> {
    const response = await apiClient.patch<{ success: boolean; data: Role }>(`/rbac/roles/${roleId}/`, payload);
    return response.data;
  },

  async deleteRole(roleId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/rbac/roles/${roleId}/`);
    return response.data;
  },

  async getPermissions(): Promise<{ success: boolean; data: Permission[] }> {
    const response = await apiClient.get<{ success: boolean; data: Permission[] }>("/rbac/permissions/");
    return response.data;
  },

  async getMemberships(): Promise<{ success: boolean; data: TenantMembership[] }> {
    const response = await apiClient.get<{ success: boolean; data: TenantMembership[] }>("/rbac/memberships/");
    return response.data;
  },

  async assignMembershipRoles(
    membershipId: string,
    payload: AssignMembershipRolesPayload
  ): Promise<{ success: boolean; data: TenantMembership }> {
    const response = await apiClient.post<{ success: boolean; data: TenantMembership }>(
      `/rbac/memberships/${membershipId}/assign/`,
      payload
    );
    return response.data;
  },

  async seedRBAC(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>("/rbac/seed/", {});
    return response.data;
  },
};

