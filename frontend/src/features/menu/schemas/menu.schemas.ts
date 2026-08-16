import { z } from "zod";

export const menuCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(150, "Name cannot exceed 150 characters"),
  description: z.string().optional(),
  display_order: z.number().int().min(0, "Display order must be positive"),
  is_active: z.boolean(),
});

export type MenuCategoryFormData = z.infer<typeof menuCategorySchema>;

export const menuItemSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Item name is required").max(200, "Name cannot exceed 200 characters"),
  description: z.string().optional(),
  price: z
    .string()
    .min(1, "Price is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Valid price format required (e.g. 12.50)"),
  is_available: z.boolean(),
  is_active: z.boolean(),
  display_order: z.number().int().min(0, "Display order must be positive"),
});

export type MenuItemFormData = z.infer<typeof menuItemSchema>;
