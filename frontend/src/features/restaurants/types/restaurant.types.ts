export interface BusinessHour {
  id?: string;
  day_of_week: number;
  day_name?: string;
  opening_time?: string | null;
  closing_time?: string | null;
  is_closed: boolean;
  is_overnight?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  legal_name?: string;
  slug: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  timezone: string;
  currency: string;
  is_active: boolean;
  business_hours: BusinessHour[];
  created_at: string;
  updated_at: string;
}

export interface RestaurantUpdatePayload {
  name: string;
  legal_name?: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  currency?: string;
}
