export interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  points_enabled: boolean;
  earning_rate: string;
  redemption_enabled: boolean;
  redemption_rate: string;
  min_points_redemption: number;
  points_expiration_enabled: boolean;
  points_expiration_days: number;
  created_at: string;
  updated_at: string;
}

export interface MembershipTier {
  id: string;
  name: string;
  rank: number;
  qualification_spend: string;
  points_multiplier: string;
  discount_percentage: string;
  is_active: boolean;
  created_at: string;
}

export interface LoyaltyAccount {
  id: string;
  customer: string;
  customer_name: string;
  customer_phone: string;
  current_tier?: string | null;
  tier_name: string;
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  transaction_type: "EARN" | "REDEEM" | "ADJUSTMENT" | "EXPIRE" | "REVERSAL" | "BONUS";
  points: number;
  balance_after: number;
  reference_type: string;
  reference_id: string;
  description: string;
  created_at: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  reward_type: "FIXED_DISCOUNT" | "PERCENTAGE_DISCOUNT" | "FREE_ITEM";
  points_cost: number;
  discount_amount: string;
  discount_percentage: string;
  min_order_value: string;
  is_active: boolean;
  created_at: string;
}

export interface GiftCard {
  id: string;
  card_number: string;
  customer?: string | null;
  customer_name: string;
  initial_balance: string;
  current_balance: string;
  currency: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "EXPIRED" | "DEPLETED" | "CANCELLED";
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}
