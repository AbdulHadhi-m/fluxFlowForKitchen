# Promotion Rules & Discount Engine

## Evaluation Flow

When an order is submitted to `/api/v1/marketing/promotions/evaluate/`:

1. **Status & Schedule Check**:
   - Promotion status must be `ACTIVE`.
   - `start_at <= now <= end_at`.

2. **Usage Limit Checks**:
   - `current_usage_count < total_usage_limit`.
   - `daily_usage_count < daily_usage_limit`.
   - `customer_usage_count < per_customer_limit`.

3. **Audience Qualification**:
   - `ALL`: Open to all guests.
   - `FIRST_ORDER`: Verified 0 previous visits and 0 promotion redemptions.
   - `RETURNING`: Must have at least 1 completed dining visit.
   - `INACTIVE_CUSTOMERS`: Last visit exceeded `target_inactive_days` threshold.
   - `CUSTOMER_SEGMENT`: Evaluated dynamically via `CustomerSegmentService`.
   - `LOYALTY_TIER`: Customer's current loyalty tier matches rule criteria.

4. **Minimum Spend & Item Eligibility**:
   - `order.subtotal >= promotion.min_order_value`.
   - Specific items or categories checked against order item lines.

5. **Discount Calculation**:
   - `PERCENTAGE_DISCOUNT`: `(applicable_subtotal * discount_value) / 100` (capped at `max_discount_amount`).
   - `FIXED_DISCOUNT`: `min(discount_value, applicable_subtotal)`.
   - `BUY_X_GET_Y` / `FREE_ITEM`: Applicable item monetary equivalent.

6. **Stacking & Priority Resolution**:
   - Highest priority rule chosen as primary recommendation.
   - If primary is marked `stackable: true`, secondary stackable promotions are added without exceeding total subtotal.
