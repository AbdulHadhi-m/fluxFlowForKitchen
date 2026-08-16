# Fluxiflow for Kitchen — Table Management & Floor Plan

---

## 1. Domain Overview
The **Table Management** domain manages physical dining tables, seating capacities, floor sections/zones, and live operational occupancy states (Available, Occupied, Reserved, Out of Service).

---

## 2. Core Models (`backend/apps/tables/models.py`)

### `RestaurantTable`
- **Primary Identifier**: UUIDv4 (`id`)
- **Tenant Boundary**: ForeignKey to `Restaurant` (`related_name="tables"`).
- **Human-Readable Name**: `name` (e.g. `T01`, `Table 12`, `VIP-1`), unique within the restaurant via `UniqueConstraint(fields=["restaurant", "name"])`.
- **Seating Capacity**: `capacity` (Positive integer >= 1, guaranteed via `CheckConstraint(check=Q(capacity__gte=1))`).
- **Floor Section**: `section` (e.g. `Main Dining`, `Patio`, `Bar`, `VIP`).
- **Operational Status**: `status` (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `OUT_OF_SERVICE`).
- **Lifecycle Flag**: `is_active` (boolean). Inactive tables are hidden from operational floor plans.
- **Ordering**: Explicit `display_order` (PositiveIntegerField) for deterministic POS floor layouts.

---

## 3. Future Order Integration Architecture
> **Architectural Rule**: Tables established in Prompt 11 will be referenced by future Order records:
> - Order records in Prompt 12 will link to `RestaurantTable`.
> - Active orders will influence table occupancy transitions (e.g. placing an order automatically transitions table to `OCCUPIED`, and settlement frees the table to `AVAILABLE`).

---

## 4. API Endpoints (`/api/v1/tables/`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/tables/` | List tables with search, section filter, and status filter | `tables.view` |
| `POST` | `/api/v1/tables/` | Create a new restaurant table | `tables.create` |
| `GET` | `/api/v1/tables/{id}/` | Get table details | `tables.view` |
| `PATCH`| `/api/v1/tables/{id}/` | Update table name, capacity, section, or display order | `tables.update` |
| `PATCH`| `/api/v1/tables/{id}/status/` | Controlled update of operational occupancy status | `tables.status.manage` / `tables.update` |
| `DELETE`| `/api/v1/tables/{id}/` | Soft-deactivate table from floor plan | `tables.delete` |

---

## 5. Frontend Architecture (`src/features/tables/`)
```
frontend/src/features/tables/
├── api/
│   └── table.api.ts              # Typed Axios API methods
├── components/
│   ├── TableCard.tsx             # Table card with capacity, section, and status badge
│   ├── TableGrid.tsx             # Responsive floor grid grouped by section
│   ├── TableModal.tsx            # Table create/edit modal with Zod validation
│   └── TableStatusModal.tsx      # Quick status change modal for dining floor operations
├── hooks/
│   └── useTables.ts              # TanStack Query query and mutation hooks
├── pages/
│   └── TableManagementPage.tsx   # Responsive floor dashboard with section filter tabs
├── schemas/
│   └── table.schemas.ts          # Zod validation schemas
├── test/
│   ├── TableCard.test.tsx
│   └── TableGrid.test.tsx
└── types/
    └── table.types.ts            # TypeScript domain interfaces
```

---

## 6. Security & Tenant Isolation
- **Tenant Scope Resolution**: Table queries and mutations resolve strictly from `request.user`'s current active restaurant.
- **Cross-Tenant Table Defense**: Attempting to view, modify, or change the status of a table belonging to another restaurant results in `404 Not Found`.
- **RBAC Gating**: `Restaurant Admin` and authorized `Manager` have table configuration privileges; `Waiter` has floor visibility (`tables.view`) and status control (`tables.status.manage`) but cannot alter physical table configurations (`tables.create`, `tables.update`, `tables.delete`).
