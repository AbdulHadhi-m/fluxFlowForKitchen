export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
  date_of_birth?: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
  preferred_table?: string | null;
  dietary_preferences: string[];
  allergies: string[];
  tags: CustomerTag[];
  internal_notes: string;
  total_visits: number;
  total_spend: string;
  last_visit_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerPayload {
  first_name: string;
  last_name?: string;
  phone: string;
  email?: string;
  date_of_birth?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
  dietary_preferences?: string[];
  allergies?: string[];
  internal_notes?: string;
  tag_ids?: string[];
}

export interface Reservation {
  id: string;
  reservation_number: string;
  customer: string;
  customer_name: string;
  customer_phone: string;
  table?: string | null;
  table_name?: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  special_requests: string;
  cancellation_reason: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReservationPayload {
  customer: string;
  table?: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  special_requests?: string;
}

export interface CRMAnalytics {
  total_customers: number;
  repeat_customers: number;
  repeat_rate_percentage: number;
  total_spend: string;
  average_customer_spend: number;
}
