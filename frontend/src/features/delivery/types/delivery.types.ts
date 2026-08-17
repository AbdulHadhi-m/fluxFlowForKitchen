export type DeliveryStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY_FOR_DISPATCH'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export type DriverAvailability = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export type VehicleType = 'BIKE' | 'CAR' | 'BICYCLE' | 'WALKER';

export interface CustomerAddress {
  id: string;
  customer?: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  recipient_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  landmark?: string;
  city: string;
  state?: string;
  postal_code: string;
  latitude?: string | null;
  longitude?: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryZone {
  id: string;
  restaurant?: string;
  name: string;
  description?: string;
  postal_codes: string[];
  fee: string;
  minimum_order: string;
  maximum_order?: string | null;
  estimated_minutes: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryDriver {
  id: string;
  restaurant?: string;
  staff_profile: string;
  full_name: string;
  employee_id: string;
  email: string;
  vehicle_type: VehicleType;
  vehicle_number: string;
  phone: string;
  availability_status: DriverAvailability;
  active_deliveries_count: number;
  total_completed_deliveries: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryEvent {
  id: string;
  event_type: string;
  actor?: string | null;
  actor_name: string;
  notes: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DeliveryListItem {
  id: string;
  order: string;
  order_number: string;
  order_total: string;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  address_line_1: string;
  city: string;
  postal_code: string;
  zone?: string | null;
  zone_name: string;
  assigned_driver?: string | null;
  driver_name: string;
  delivery_fee: string;
  estimated_delivery_at?: string | null;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

export interface DeliveryDetail {
  id: string;
  restaurant: string;
  order: string;
  order_number: string;
  order_subtotal: string;
  order_total: string;
  order_items: Array<{
    name: string;
    quantity: number;
    unit_price: string;
    total_price: string;
    notes?: string;
  }>;
  customer?: string | null;
  zone?: string | null;
  zone_name: string;
  assigned_driver?: string | null;
  driver?: DeliveryDriver | null;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  address_line_1: string;
  address_line_2: string;
  landmark: string;
  city: string;
  state: string;
  postal_code: string;
  delivery_instructions: string;
  delivery_fee: string;
  delivery_pin: string;
  estimated_delivery_at?: string | null;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  failed_at?: string | null;
  failure_reason?: string;
  events: DeliveryEvent[];
  created_at: string;
  updated_at: string;
}

export interface DeliveryMetrics {
  pending_count: number;
  ready_for_dispatch_count: number;
  assigned_count: number;
  out_for_delivery_count: number;
  completed_today_count: number;
  failed_today_count: number;
  available_drivers_count: number;
  total_drivers_count: number;
}

export interface DeliveryEstimateResponse {
  eligible: boolean;
  reason?: string;
  zone_id?: string | null;
  zone_name: string;
  delivery_fee: string;
  estimated_minutes_min: number;
  estimated_minutes_max: number;
  estimated_time_label: string;
}
