import { z } from "zod";

export const createBillSchema = z.object({
  order_id: z.string().uuid("Please select a valid order."),
  discount_type: z.enum(["NONE", "PERCENTAGE", "FIXED"]),
  discount_value: z.coerce.number().min(0, "Discount value cannot be negative."),
  service_charge_rate: z.coerce.number().min(0).max(50, "Service charge cannot exceed 50%."),
  notes: z.string().max(500),
});

export type CreateBillFormValues = z.infer<typeof createBillSchema>;

export const processPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Payment amount must be greater than zero."),
  payment_method: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER"]),
  amount_tendered: z.coerce.number().min(0).optional().nullable(),
  reference: z.string().max(128),
});

export type ProcessPaymentFormValues = z.infer<typeof processPaymentSchema>;
