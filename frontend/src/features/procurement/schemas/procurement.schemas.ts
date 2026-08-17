import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters."),
  contact_person: z.string().max(150),
  email: z.string().email().or(z.literal("")),
  phone: z.string().max(30),
  address: z.string().max(500),
  notes: z.string().max(500),
});

export type CreateSupplierFormValues = z.infer<typeof createSupplierSchema>;

export const createPOItemSchema = z.object({
  inventory_item_id: z.string().uuid("Please select an inventory item."),
  quantity_ordered: z.coerce.number().min(0.001, "Quantity must be greater than zero."),
  unit: z.enum(["kg", "g", "l", "ml", "piece", "portion", "pack", "bottle", "box", "oz", "lb"]),
  unit_cost: z.coerce.number().min(0, "Cost cannot be negative."),
});

export const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().uuid("Please select a vendor supplier."),
  order_date: z.string().optional(),
  expected_delivery_date: z.string().optional(),
  tax_amount: z.coerce.number().min(0),
  notes: z.string().max(500),
  items: z.array(createPOItemSchema).min(1, "At least one item is required in the PO."),
});

export type CreatePurchaseOrderFormValues = z.infer<typeof createPurchaseOrderSchema>;

export const receiveGoodsItemSchema = z.object({
  purchase_order_item_id: z.string().uuid(),
  quantity: z.coerce.number().min(0),
});

export const receiveGoodsSchema = z.object({
  items: z.array(receiveGoodsItemSchema),
  notes: z.string().max(255),
});

export type ReceiveGoodsFormValues = z.infer<typeof receiveGoodsSchema>;
