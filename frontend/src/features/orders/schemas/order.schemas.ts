import { z } from "zod";

export const orderItemInputSchema = z.object({
  menu_item_id: z.string().uuid("Invalid menu item ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  notes: z.string().optional().default(""),
});

export const orderCreateSchema = z.object({
  table_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().default(""),
  status: z.enum(["DRAFT", "PLACED"]).default("PLACED"),
  items: z.array(orderItemInputSchema).min(1, "Order must contain at least one item"),
});

export type OrderCreateFormData = z.infer<typeof orderCreateSchema>;
