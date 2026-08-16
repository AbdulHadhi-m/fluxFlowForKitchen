import { Role } from "@/features/authorization/types/rbac.types";

export type StaffStatus = "ACTIVE" | "DISABLED";

export interface StaffMember {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone: string;
  primary_role: Role;
  secondary_roles: Role[];
  status: StaffStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffCreatePayload {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  primary_role: string;
  secondary_roles?: string[];
  password?: string;
  employee_id?: string;
}

export interface StaffUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  primary_role?: string;
  secondary_roles?: string[];
  status?: StaffStatus;
}
