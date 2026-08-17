# Fluxiflow Marketing & Promotions Architecture

## 1. Overview
The Marketing & Promotion Management system in Fluxiflow for Kitchen delivers enterprise-grade promotional campaigns, discount rule engines, secure voucher generation, audience segmentation, customer consent management, and cashier POS checkout evaluation.

---

## 2. Core Entities & Data Architecture

```
                               ┌───────────────────────────┐
                               │        Restaurant         │
                               └─────────────┬─────────────┘
                                             │ 1:N
             ┌───────────────────────────────┼───────────────────────────────┐
             │                               │                               │
             ▼                               ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
    │ CustomerSegment │             │    Promotion    │             │MarketingConsent │
    └────────┬────────┘             └────────┬────────┘             └─────────────────┘
             │                               │
             │ 0..1:N                        │ 1:N
             ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │    Campaign     │             │     Coupon      │
    └────────┬────────┘             └────────┬────────┘
             │                               │
             │ 1:N                           │ 1:N
             ▼                               ▼
    ┌─────────────────────┐         ┌─────────────────┐
    │ CampaignDeliveryLog │         │ PromotionUsage  │
    └─────────────────────┘         └─────────────────┘
```

### Models
1. **`Promotion`**:
   - `promotion_type`: `PERCENTAGE_DISCOUNT`, `FIXED_DISCOUNT`, `BUY_X_GET_Y`, `FREE_ITEM`.
   - `discount_value`: Monetary percentage or currency deduction.
   - `min_order_value`: Minimum spend before promotion qualifies.
   - `max_discount_amount`: Ceiling cap on percentage discounts.
   - `priority`: Higher priority evaluated first; non-stackable promotions prevent subsequent discounts.
   - `stackable`: Boolean indicating if combined discounts are permitted.
   - `coupon_required`: Boolean enforcing matching coupon redemption code.
   - Targeting: `ALL`, `SPECIFIC_CUSTOMERS`, `CUSTOMER_TAGS`, `CUSTOMER_SEGMENT`, `LOYALTY_TIER`, `FIRST_ORDER`, `RETURNING`, `INACTIVE_CUSTOMERS`.

2. **`Coupon`**:
   - Cryptographically random unique codes (`Coupon.generate_secure_code(prefix, length)`).
   - Single and bulk generation with collision prevention.
   - Global usage limits & per-customer limits.

3. **`PromotionUsage`**:
   - Append-only redemption ledger recording `discount_amount`, `order_id`, `bill_id`, `customer_id`, and `coupon_id`.
   - Atomic DB-locked counter updates preventing race condition double-spending.
   - Order cancellation/refund reversal tracking (`is_reversed = True`).

4. **`CustomerSegment`**:
   - Dynamic criteria evaluating lifetime spend (`min_spend`), visit frequency (`min_visits`), inactivity days (`inactive_days`), customer tags, and loyalty tiers.

5. **`MarketingConsent`**:
   - Legal consent ledger per customer per channel (`EMAIL`, `SMS`, `PUSH`) with status (`GRANTED`, `REVOKED`) and audit trail.

6. **`Campaign` & `CampaignDeliveryLog`**:
   - Broadcast management for in-app, SMS, and email messages.
   - Idempotent delivery tracking with deduplication keys.

---

## 3. RBAC Permissions
| Permission Code | Role Grants | Description |
| :--- | :--- | :--- |
| `marketing.view` | Owner, Admin, Manager, Cashier | View active promotions, coupons, segments, and analytics |
| `marketing.create`| Owner, Admin, Manager | Create promotions, generate coupons, configure segments |
| `marketing.manage`| Owner, Admin, Manager | Activate/pause rules, launch campaigns, update consent |
| `marketing.delete`| Owner, Admin | Archive promotion rules and delete campaigns |
| `marketing.override`| Owner, Admin, Manager | Manual discount overrides at POS checkout |

---

## 4. API Endpoints
- `GET /api/v1/marketing/promotions/` — List active/paused promotions.
- `POST /api/v1/marketing/promotions/` — Create new promotion rule.
- `POST /api/v1/marketing/promotions/evaluate/` — POS discount evaluation.
- `GET /api/v1/marketing/coupons/` — List vouchers.
- `POST /api/v1/marketing/coupons/bulk-generate/` — Batch voucher generator.
- `POST /api/v1/marketing/coupons/validate/` — Single coupon code validation.
- `GET /api/v1/marketing/segments/` — List customer audience segments.
- `GET /api/v1/marketing/segments/{id}/preview/` — Dynamic audience calculation & preview.
- `GET /api/v1/marketing/campaigns/` — List marketing campaigns.
- `POST /api/v1/marketing/campaigns/{id}/launch/` — Execute campaign broadcast.
- `GET /api/v1/marketing/analytics/` — Real-time marketing KPI summary.
- `POST /api/v1/marketing/consent/update_consent/` — Update customer consent.
