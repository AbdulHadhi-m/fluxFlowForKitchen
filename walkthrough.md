# Walkthrough: Online Ordering, Customer Ordering Portal & Digital Menu

## Overview
Implemented an end-to-end customer-facing digital ordering engine and storefront portal for Fluxiflow for Kitchen (Prompt 25). The system integrates directly with the existing core Order domain, KDS, Billing, Payments, Loyalty, and Promotions without duplicate subsystems.

---

## 1. Backend Implementation (`backend/apps/ordering/`)

### Enhanced Models & Schema
- **`Order` Model**: Added `order_type` (`DINE_IN`, `TAKEAWAY`, `DELIVERY`), `source` (`POS`, `ONLINE`, `QR`), `customer` CRM link, `guest_name`, `guest_phone`, `guest_email`, `pickup_time`, `tracking_token`, and `qr_session_id`. Made `created_by` nullable.
- **`RestaurantTable`**: Added `qr_code_token` with automated cryptographic token generation (`QR-XXXXXX`).
- **`RestaurantConfiguration`**: Added online ordering master toggles, QR ordering toggle, takeaway toggle, guest checkout toggle, and min/max order spend thresholds.
- **`CartSession`**: Optional server-side session persistence for guest and authenticated customer carts.

### Services (`apps/ordering/services.py`)
- **`PublicMenuService`**: Public restaurant discovery, live opening hours evaluation, catalog category grouping, and search.
- **`CartValidationService`**: Authoritative pricing, 86'd out-of-stock validation, min/max limits, promotion/coupon evaluation, and tax computation.
- **`OnlineCheckoutService`**: Idempotent order placement, promotion usage recording, KDS kitchen ticket creation, billing invoice snapshotting, and staff alert dispatch.
- **`QRTableService`**: Secure table QR code resolution and table context validation.
- **`CustomerPortalService`**: Public order tracking by UUID token and customer order history.

### Endpoints (`apps/ordering/views.py`)
- `GET /api/v1/public/restaurants/<slug>/`
- `GET /api/v1/public/restaurants/<slug>/menu/`
- `GET /api/v1/ordering/qr/validate/`
- `POST /api/v1/ordering/cart/validate/`
- `POST /api/v1/ordering/checkout/`
- `GET /api/v1/ordering/orders/<tracking_token>/`
- `POST /api/v1/customer/register/`
- `POST /api/v1/customer/login/`
- `GET /api/v1/customer/orders/`

---

## 2. Frontend Implementation (`frontend/src/features/ordering/`)

- **State Management**:
  - `useCartStore`: Persistent Zustand store for client cart items, quantities, special instructions, and table QR context.
  - `useOrdering`: TanStack Query hooks for public storefront data and auto-polling order tracking.
- **Components**:
  - `StorefrontHeader`: Branding hero, live open/closed status badge, table indicator.
  - `CategoryNav`: Sticky category pill navigation bar.
  - `MenuItemCard`: Dish card with price, description, out-of-stock badge, and add-to-cart actions.
  - `ItemDetailModal`: Dish customization popup with special instructions textarea.
  - `OrderTimeline`: Visual 4-step preparation tracker (Placed -> Preparing -> Ready -> Completed).
- **Pages & Routes**:
  - `/r/:restaurantSlug`: Public Restaurant Storefront & Digital Menu.
  - `/r/:restaurantSlug/table/:qrToken`: QR Table Ordering Landing.
  - `/r/:restaurantSlug/cart`: Cart Review & Fulfillment Selector.
  - `/r/:restaurantSlug/checkout`: Final Checkout & Payment Selection.
  - `/r/:restaurantSlug/order/:trackingToken/track`: Live Real-time Order Tracking.
  - `/customer/portal`: Customer Account Sign In / Sign Up and Past Orders.

---

## 3. Verification & Test Results

- **Backend Pytest**: **167 passed** across all modules (Prompts 4–25).
- **Frontend Vitest**: **63 passed** across 41 test suites.
- **Frontend Production Build**: `tsc && vite build` compiled with zero errors.
