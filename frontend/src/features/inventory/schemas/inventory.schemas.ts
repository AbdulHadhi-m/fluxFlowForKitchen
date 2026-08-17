import { z } from "zod";

export const unitOfMeasureEnum = z.enum([
  "kg",
  "g",
  "l",
  "ml",
  "piece",
  "portion",
  "pack",
  "bottle",
  "box",
  "oz",
  "lb",
]);

export const createInventoryItemSchema = z.object({
  name: z.string().min(2, "Item name must be at least 2 characters."),
  sku: z.string().max(50).optional().or(z.literal("")),
  unit: unitOfMeasureEnum,
  minimum_stock_level: z.coerce.number().min(0, "Minimum stock cannot be negative."),
  cost_per_unit: z.coerce.number().min(0, "Cost per unit cannot be negative."),
  initial_quantity: z.coerce.number().min(0, "Initial quantity cannot be negative."),
});

export type CreateInventoryItemFormValues = z.infer<typeof createInventoryItemSchema>;

export const receiveStockSchema = z.object({
  quantity: z.coerce.number().min(0.001, "Received quantity must be greater than zero."),
  unit: unitOfMeasureEnum,
  reference: z.string().max(128).optional().or(z.literal("")),
  reason: z.string().max(255).optional().or(z.literal("")),
});

export type ReceiveStockFormValues = z.infer<typeof receiveStockSchema>;

export const adjustStockSchema = z.object({
  delta_quantity: z.coerce.number().refine((val) => val !== 0, "Adjustment delta cannot be zero."),
  reason: z.string().min(3, "Please provide an adjustment reason."),
});

export type AdjustStockFormValues = z.infer<typeof adjustStockSchema>;

export const wastageSchema = z.object({
  quantity: z.coerce.number().min(0.001, "Wasted quantity must be greater than zero."),
  reason: z.string().min(3, "Please specify the spoilage / wastage reason."),
});

export type WastageFormValues = z.infer<typeof wastageSchema>;
