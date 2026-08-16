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
