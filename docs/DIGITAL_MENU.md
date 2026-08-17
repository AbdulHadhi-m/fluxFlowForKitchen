# Digital Menu Architecture & QR Ordering

## Overview
The Digital Menu subsystem powers customer-safe, performant public dining menus accessible via unique restaurant slugs (`/r/:restaurantSlug`) and table QR tokens (`/r/:restaurantSlug/table/:qrToken`).

---

## 1. Security & Data Sanitization
- **Strict Public Filtering**: Internal staff preparation notes, cost prices, inventory suppliers, and inactive menu items are strictly excluded from public responses.
- **Immediate Availability (86'd)**: Items marked `is_available=False` are flagged with "Out of stock" badges on the digital menu and blocked from checkout additions.
- **Tenant Isolation**: Restaurant menus and table QR tokens are scoped by tenant slug. Cross-tenant order creation or QR table binding is rejected with 404/400 errors.

---

## 2. Table QR Flow
1. Guest diner scans physical table QR code.
2. Directs to `/r/:restaurantSlug/table/:qrToken`.
3. Frontend calls `GET /api/v1/ordering/qr/validate/`.
4. Table context (Table ID, Table Name, Section) is pinned to customer session.
5. All placed orders automatically link to the table and trigger POS and KDS updates.
