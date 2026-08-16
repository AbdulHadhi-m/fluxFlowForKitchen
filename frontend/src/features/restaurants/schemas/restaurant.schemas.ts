import { z } from "zod";

export const restaurantProfileSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters"),
  legal_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().min(1, "Currency code is required"),
});

export type RestaurantProfileFormData = z.infer<typeof restaurantProfileSchema>;

export const businessHourItemSchema = z.object({
  day_of_week: z.number(),
  opening_time: z.string().nullable().optional(),
  closing_time: z.string().nullable().optional(),
  is_closed: z.boolean(),
  is_overnight: z.boolean().optional(),
});

export const businessHoursBatchSchema = z.object({
  hours: z.array(businessHourItemSchema),
});

export type BusinessHoursBatchFormData = z.infer<typeof businessHoursBatchSchema>;
