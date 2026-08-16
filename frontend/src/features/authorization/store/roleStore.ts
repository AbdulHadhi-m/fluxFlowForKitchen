import { create } from "zustand";
import { Role } from "../types/rbac.types";

interface RoleState {
  activeRole: Role | null;
  availableRoles: Role[];
  permissions: string[];
  tenantId: string | null;
  setRoleContext: (
    activeRole: Role | null,
    availableRoles: Role[],
    permissions: string[],
    tenantId?: string | null
  ) => void;
  clearRoleContext: () => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  activeRole: null,
  availableRoles: [],
  permissions: [],
  tenantId: null,
  setRoleContext: (activeRole, availableRoles, permissions, tenantId = null) =>
    set({
      activeRole,
      availableRoles,
      permissions,
      tenantId,
    }),
  clearRoleContext: () =>
    set({
      activeRole: null,
      availableRoles: [],
      permissions: [],
      tenantId: null,
    }),
}));
