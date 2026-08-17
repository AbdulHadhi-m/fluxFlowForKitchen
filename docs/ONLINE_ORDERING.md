# Online Ordering Architecture & Specifications

## Overview
Fluxiflow for Kitchen Online Ordering provides a customer-facing digital ordering engine seamlessly connected to the core Single Source of Truth architecture. Customer orders created via web or QR scanning feed directly into the existing Order Management, Kitchen Display System (KDS), Billing, and Notification pipelines.

---

## 1. Core Principles
- **No Duplicate Order Domain**: The existing `apps.orders.models.Order` entity represents all operational orders. The ordering layer orchestrates validation and checkout through `OrderService.create_order`.
- **Authoritative Price & Availability Verification**: The client cart is treated as an untrusted intent payload. The server validates immediate kitchen 86'd status, catalog presence, modifiers, taxes, and promotional deductions.
- **Fulfillment Types**:
  - `DINE_IN`: Table-assigned mobile dining order with QR code validation or table picker.
  - `TAKEAWAY`: Customer pickup with optional scheduled pickup window.
- **Order Sources**:
  - `ONLINE`: Customer web storefront.
  - `QR`: Scanned table QR code dining session.

---

## 2. API Endpoints

### Public Storefront & Digital Menu
- `GET /api/v1/public/restaurants/{slug}/`: Public restaurant profile, business hours, and operational status.
- `GET /api/v1/public/restaurants/{slug}/menu/`: Published category groupings and active menu items with availability tags.

### Table QR & Cart Validation
- `GET /api/v1/ordering/qr/validate/?restaurant_slug={slug}&qr_token={token}`: Validates table QR code and returns table seating context.
- `POST /api/v1/ordering/cart/validate/`: Evaluates cart items, verifies stock, and returns authoritative item totals, promotions, and taxes.

### Checkout & Order Placement
- `POST /api/v1/ordering/checkout/`: Idempotent order placement creating core Order, Kitchen preparation ticket, bill snapshot, and staff alerts.

### Customer Order Tracking & Portal
- `GET /api/v1/ordering/orders/{tracking_token}/`: Public real-time order tracking status by secure UUID.
- `POST /api/v1/customer/register/`: Customer portal registration.
- `POST /api/v1/customer/login/`: Customer portal login.
- `GET /api/v1/customer/orders/`: Customer authenticated order history.

---

## 3. Checkout Pipeline Flow

```
1. Customer Cart Submission
         │
         ▼
2. Authoritative Validation (CartValidationService)
   ├── Check restaurant open & online ordering enabled
   ├── Check minimum spend threshold
   ├── Verify menu items active and not 86'd
   ├── Calculate promotional discounts (PromotionCalculationService)
   └── Calculate restaurant tax rate (BillingService)
         │
         ▼
3. Atomic Order Placement (OnlineCheckoutService)
   ├── OrderService.create_order()
   ├── PromotionRedemptionService.record_promotion_redemption()
   ├── KitchenService.create_ticket_for_order() (KDS Dispatch)
   ├── BillingService.create_bill_for_order() (Invoice Generation)
   ├── PaymentService.process_payment() (if card method)
   └── NotificationService.create_notification() (Staff Alert)
         │
         ▼
4. Order Confirmation & Live Tracking
```
