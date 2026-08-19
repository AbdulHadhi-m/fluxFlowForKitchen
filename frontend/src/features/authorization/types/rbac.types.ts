export interface Permission {
  id: string;
  resource: string;
  action: string;
  code: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  is_system: boolean;
  tenant_id?: string | null;
  permissions?: Permission[];
  permission_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SwitchRoleResponse {
  success: boolean;
  data: {
    tenant_id: string;
    active_role: Role;
    available_roles: Role[];
    permissions: string[];
  };
}

export interface AuthContextResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      full_name: string;
    };
    membership: {
      id: string;
      tenant_id: string;
    } | null;
    active_role: Role | null;
    available_roles: Role[];
    permissions: string[];
  };
}

export interface CreateRolePayload {
  name: string;
  code?: string;
  description?: string;
  permission_ids?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permission_ids?: string[];
}

export interface TenantMembershipUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export interface TenantMembership {
  id: string;
  user: TenantMembershipUser;
  tenant_id: string;
  active_role: Role | null;
  assigned_roles: Role[];
  effective_permissions: string[];
  is_active: boolean;
  created_at: string;
}

export interface AssignMembershipRolesPayload {
  assigned_role_ids: string[];
  active_role_id?: string | null;
}

