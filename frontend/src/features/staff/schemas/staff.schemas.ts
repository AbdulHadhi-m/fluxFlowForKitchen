import { z } from "zod";

export const staffCreateSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    primary_role: z.string().min(1, "Primary role is required"),
    secondary_roles: z.array(z.string()),
    password: z.string().optional(),
    employee_id: z.string().optional(),
  })
  .refine(
    (data) => !data.secondary_roles.includes(data.primary_role),
    {
      message: "Primary role cannot also be selected as a secondary role",
      path: ["secondary_roles"],
    }
  );

export type StaffCreateFormData = z.infer<typeof staffCreateSchema>;

export const staffUpdateSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    primary_role: z.string().min(1, "Primary role is required"),
    secondary_roles: z.array(z.string()),
    status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  })
  .refine(
    (data) => !data.secondary_roles.includes(data.primary_role),
    {
      message: "Primary role cannot also be selected as a secondary role",
      path: ["secondary_roles"],
    }
  );

export type StaffUpdateFormData = z.infer<typeof staffUpdateSchema>;
