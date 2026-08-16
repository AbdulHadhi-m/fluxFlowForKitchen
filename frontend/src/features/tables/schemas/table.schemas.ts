import { z } from "zod";

export const tableSchema = z.object({
  name: z.string().min(1, "Table number/name is required").max(50, "Name cannot exceed 50 characters"),
  capacity: z.number().int().min(1, "Capacity must be at least 1 seat"),
  section: z.string().optional(),
  display_order: z.number().int().min(0, "Display order must be positive"),
  is_active: z.boolean(),
});

export type TableFormData = z.infer<typeof tableSchema>;

export const tableStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "OUT_OF_SERVICE"]),
});

export type TableStatusFormData = z.infer<typeof tableStatusSchema>;
