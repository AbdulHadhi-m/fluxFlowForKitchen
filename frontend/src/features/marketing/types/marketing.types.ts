export type PromotionType =
  | "PERCENTAGE_DISCOUNT"
  | "FIXED_DISCOUNT"
  | "BUY_X_GET_Y"
  | "FREE_ITEM";

export type PromotionStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "ARCHIVED";

export type AudienceTargetType =
  | "ALL"
  | "SPECIFIC_CUSTOMERS"
  | "CUSTOMER_TAGS"
  | "CUSTOMER_SEGMENT"
  | "LOYALTY_TIER"
  | "FIRST_ORDER"
  | "RETURNING"
  | "INACTIVE_CUSTOMERS";

export type ItemTargetType = "ALL_ITEMS" | "SPECIFIC_ITEMS" | "CATEGORIES";

export type CustomerSegmentType =
  | "ALL_CUSTOMERS"
  | "NEW_CUSTOMERS"
  | "REGULAR_CUSTOMERS"
  | "VIP_CUSTOMERS"
  | "INACTIVE_CUSTOMERS"
  | "HIGH_VALUE_CUSTOMERS"
  | "CUSTOM";

export type CouponStatus = "ACTIVE" | "DISABLED" | "EXPIRED";

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export type CampaignChannel = "IN_APP" | "EMAIL" | "SMS";

export type ConsentChannel = "EMAIL" | "SMS" | "PUSH";
export type ConsentStatus = "GRANTED" | "REVOKED";

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  segment_type: CustomerSegmentType;
  min_spend: string;
  min_visits: number;
  inactive_days: number;
  tags: string[];
  tags_detail?: Array<{ id: string; name: string; color: string }>;
  loyalty_tiers: string[];
  loyalty_tiers_detail?: Array<{ id: string; name: string; rank: number }>;
  is_active: boolean;
  audience_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  promotion: string;
  promotion_name: string;
  promotion_type: PromotionType;
  code: string;
  status: CouponStatus;
  usage_limit: number | null;
  per_customer_limit: number;
  current_usage_count: number;
  valid_from: string;
  valid_until: string | null;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  name: string;
  description: string;
  promotion_type: PromotionType;
  discount_value: string;
  status: PromotionStatus;
  start_at: string;
  end_at: string | null;
  priority: number;
  stackable: boolean;
  coupon_required: boolean;
  min_order_value: string;
  max_discount_amount: string | null;
  total_usage_limit: number | null;
  per_customer_limit: number;
  daily_usage_limit: number | null;
  current_usage_count: number;
  target_audience_type: AudienceTargetType;
  target_segment: string | null;
  target_segment_name?: string;
  target_customers: string[];
  target_tags: string[];
  target_loyalty_tiers: string[];
  target_inactive_days: number;
  target_item_type: ItemTargetType;
  target_menu_items: string[];
  target_menu_items_detail?: Array<{ id: string; name: string; price: string }>;
  target_categories: string[];
  target_categories_detail?: Array<{ id: string; name: string }>;
  coupons_count: number;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  promotion: string | null;
  promotion_name?: string;
  target_segment: string | null;
  target_segment_name?: string;
  channel: CampaignChannel;
  title: string;
  message_template: string;
  start_at: string;
  end_at: string | null;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  skipped_count: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingConsent {
  id: string;
  customer: string;
  customer_name: string;
  customer_phone: string;
  channel: ConsentChannel;
  status: ConsentStatus;
  source: string;
  granted_at: string | null;
  revoked_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PromotionEvaluationResult {
  order_id: string;
  order_number: string;
  subtotal: string;
  total_discount: string;
  net_total: string;
  applied_promotions: Array<{
    promotion_id: string;
    promotion_name: string;
    promotion_type: PromotionType;
    discount_value: string;
    discount_amount: string;
    priority: number;
    stackable: boolean;
    coupon_required: boolean;
    coupon_code: string | null;
    reason: string;
  }>;
  eligible_promotions: Array<{
    promotion_id: string;
    promotion_name: string;
    promotion_type: PromotionType;
    discount_value: string;
    discount_amount: string;
    priority: number;
    stackable: boolean;
    coupon_required: boolean;
    coupon_code: string | null;
    reason: string;
  }>;
  recommended_promotion: {
    promotion_id: string;
    promotion_name: string;
    promotion_type: PromotionType;
    discount_value: string;
    discount_amount: string;
    coupon_code: string | null;
  } | null;
  has_discount: boolean;
}

export interface MarketingAnalyticsOverview {
  active_promotions_count: number;
  active_coupons_count: number;
  total_campaigns_count: number;
  total_segments_count: number;
  total_redemptions: number;
  total_discount_given: string;
  promotional_revenue_influenced: string;
  top_promotions: Array<{
    id: string;
    name: string;
    type: PromotionType;
    redemptions: number;
    total_discount: string;
  }>;
  top_coupons: Array<{
    id: string;
    code: string;
    promotion_name: string;
    redemptions: number;
    total_discount: string;
  }>;
}
