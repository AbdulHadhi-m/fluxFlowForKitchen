# Fluxiflow for Kitchen — Restaurant Setup & Tenant Foundation

---

## 1. Domain Overview
The **Restaurant** model serves as the central tenant context in Fluxiflow for Kitchen. Every operational resource (Menu, Tables, Orders, Kitchen Display Tickets, Billing Records, and Staff Memberships) is strictly partitioned by `restaurant_id` (`tenant_id`).

---

## 2. Model Structure

### `Restaurant` (`apps.restaurants.models.Restaurant`)
- **Primary Identifier**: UUIDv4 (`id`)
- **Human Identifier**: Auto-generated collision-safe unique `slug`
- **Fields**: `name`, `legal_name`, `phone`, `email`, `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`, `timezone`, `currency`, `is_active`

### `BusinessHour` (`apps.restaurants.models.BusinessHour`)
- Weekly operating schedule for Monday (0) through Sunday (6).
- Supports `opening_time`, `closing_time`, `is_closed` (Closed all day), and `is_overnight` (shifts ending past midnight).
- Unique database constraint: `(restaurant, day_of_week)`

---

## 3. Tenant Isolation & Membership Integration
- **PRD Rule**: Every authenticated staff member belongs to exactly one restaurant organization.
- **SaaS Owner**: Platform-wide administrator with no restaurant tenant binding.
- **Restaurant Admin**: Operational owner of the restaurant tenant, assigned upon restaurant creation in an atomic transaction (`with transaction.atomic():`).

---

## 4. API Endpoints

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/restaurants/` | Onboard / create new restaurant organization | `IsAuthenticated` |
| `GET` | `/api/v1/restaurants/current/` | Retrieve profile and business hours for current restaurant | `settings.view` |
| `PATCH`| `/api/v1/restaurants/current/` | Update restaurant profile and localization | `settings.update` |
| `GET` | `/api/v1/restaurants/current/hours/`| Retrieve weekly business hours schedule | `settings.view` |
| `PUT` | `/api/v1/restaurants/current/hours/`| Batch update 7-day operating hours schedule | `settings.update` |

---

## 5. Security & Access Control
- `Restaurant Admin` & authorized `Manager` (`settings.update`) can modify restaurant configurations.
- `Waiter`, `Kitchen Staff`, and `Cashier` without `settings.update` receive `403 Forbidden`.
- UUID and query parameter manipulation cannot cross restaurant tenant boundaries.
