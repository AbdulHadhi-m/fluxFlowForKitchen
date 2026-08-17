export interface PublicRestaurant {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  timezone: string;
  currency: string;
  cover_image_url: string;
  tagline: string;
  online_ordering_enabled: boolean;
  qr_ordering_enabled: boolean;
  takeaway_ordering_enabled: boolean;
  guest_checkout_enabled: boolean;
  min_online_order_amount: string;
  is_open: boolean;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  is_available: boolean;
  category_id: string;
  category_name?: string;
  display_order: number;
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  items: PublicMenuItem[];
}

export interface PublicMenuData {
  restaurant_slug: string;
  restaurant_name: string;
  currency: string;
  is_open: boolean;
  categories: PublicMenuCategory[];
}

export interface CartItem {
  menu_item_id: string;
  name: string;
  price: string;
  quantity: number;
  notes?: string;
}

export interface CartValidationResponse {
  restaurant_id: string;
  restaurant_name: string;
  order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  table_id: string | null;
  table_name: string | null;
  items: {
    menu_item_id: string;
    name: string;
    unit_price: string;
    quantity: number;
    line_total: string;
    notes: string;
  }[];
  subtotal: string;
  discount_amount: string;
  applied_promotion: {
    coupon_code: string;
    promotion_id: string;
    promotion_name: string;
    discount_amount: string;
  } | null;
  tax_rate: string;
  tax_amount: string;
  total: string;
  currency: string;
  estimated_prep_time_minutes: number;
}

export interface CheckoutPayload {
  restaurant_slug: string;
  items: {
    menu_item_id: string;
    quantity: number;
    notes?: string;
  }[];
  order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  table_id?: string | null;
  qr_token?: string;
  coupon_code?: string;
  guest_info?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  payment_method: 'PAY_AT_COUNTER' | 'ONLINE_CARD' | 'CASH';
  special_instructions?: string;
  pickup_time?: string;
  idempotency_key?: string;
}

export interface CheckoutResponse {
  order_id: string;
  order_number: string;
  tracking_token: string;
  order_type: string;
  source: string;
  status: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  guest_name: string;
  table_name: string | null;
  estimated_prep_time_minutes: number;
  created_at: string;
}

export interface OrderTrackingInfo {
  order_id: string;
  order_number: string;
  tracking_token: string;
  restaurant_name: string;
  restaurant_slug: string;
  order_type: string;
  source: string;
  status: string;
  kitchen_status: string;
  display_stage: 'PLACED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  table_name: string | null;
  guest_name: string;
  subtotal: string;
  total: string;
  items: {
    name: string;
    quantity: number;
    unit_price: string;
    line_total: string;
    notes: string;
  }[];
  created_at: string;
  pickup_time: string | null;
}

export interface QRTableValidationResponse {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  table_id: string;
  table_name: string;
  section: string;
  capacity: number;
  active_orders_count: number;
  qr_token: string;
}

export interface CustomerUser {
  id: string | null;
  name: string;
  email: string;
  phone: string;
}

export interface CustomerAuthResponse {
  success: boolean;
  access_token: string;
  refresh_token: string;
  customer: CustomerUser;
}
