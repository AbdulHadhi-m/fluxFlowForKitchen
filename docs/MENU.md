# Fluxiflow for Kitchen — Menu & Catalog Management

---

## 1. Domain Overview
The **Menu & Catalog** domain manages restaurant food and beverage items, pricing structures, category groupings, and immediate live order availability (in-stock vs 86'd).

---

## 2. Core Models (`backend/apps/menu/models.py`)

### `MenuCategory`
- **Primary Identifier**: UUIDv4 (`id`)
- **Tenant Scoping**: ForeignKey to `Restaurant` (`related_name="menu_categories"`)
- **Ordering**: Explicit `display_order` (PositiveIntegerField) for deterministic catalog layout.
- **Constraints**: `UniqueConstraint(fields=["restaurant", "name"])` prevents duplicate category names within a single restaurant.

### `MenuItem`
- **Primary Identifier**: UUIDv4 (`id`)
- **Category Reference**: ForeignKey to `MenuCategory` (`on_delete=models.PROTECT`).
- **Monetary Precision**: Stored using `DecimalField(max_digits=10, decimal_places=2)`. Floats are strictly prohibited.
- **Availability vs Catalog Status**:
  - `is_active` (boolean): Catalog lifecycle presence. Inactive items are hidden from POS and public menus.
  - `is_available` (boolean): Live operational availability (in-stock vs 86'd/sold-out).
- **Constraints**: `CheckConstraint(check=Q(price__gte=0))` guarantees non-negative prices.

---

## 3. Future Order Snapshot Architecture
> **Architectural Rule**: Orders created in future prompts **MUST NOT** dynamically read `MenuItem.price` at bill generation time. When an order item is created, the system must snapshot:
> - `item_name`
> - `unit_price` (Decimal at point of sale)
> - `category_name`
>
> This protects historical invoices and revenue reports from retrospective menu price changes.

---

## 4. API Endpoints (`/api/v1/menu/`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/menu/categories/` | List categories for current restaurant with item count | `menu.view` |
| `POST` | `/api/v1/menu/categories/` | Create a new menu category | `menu.create` |
| `GET` | `/api/v1/menu/categories/{id}/` | Get category details | `menu.view` |
| `PATCH`| `/api/v1/menu/categories/{id}/` | Update category title, description, or display rank | `menu.update` |
| `DELETE`| `/api/v1/menu/categories/{id}/`| Soft-deactivate menu category | `menu.delete` |
| `GET` | `/api/v1/menu/items/` | List menu items with search, category filter, and pagination | `menu.view` |
| `POST` | `/api/v1/menu/items/` | Create a new menu item | `menu.create` |
| `GET` | `/api/v1/menu/items/{id}/` | Get menu item details | `menu.view` |
| `PATCH`| `/api/v1/menu/items/{id}/` | Update menu item details, price, or display rank | `menu.update` |
| `PATCH`| `/api/v1/menu/items/{id}/availability/` | Quick toggle item availability (Available ↔ 86'd) | `menu.availability.manage` / `menu.update` |

---

## 5. Frontend Architecture (`src/features/menu/`)
```
frontend/src/features/menu/
├── api/
│   └── menu.api.ts               # Typed Axios API methods
├── components/
│   ├── AvailabilityToggle.tsx    # Fast-action inline 86'd / Available toggle
│   ├── CategoryModal.tsx         # Category create/edit dialog with Zod validation
│   ├── CategorySidebar.tsx       # Sidebar navigation for category filtering and management
│   ├── MenuItemModal.tsx         # Menu item create/edit modal with Decimal pricing
│   └── MenuItemTable.tsx         # Menu catalog table with item details, prices, and actions
├── hooks/
│   └── useMenu.ts                # TanStack Query query and mutation hooks
├── pages/
│   └── MenuManagementPage.tsx    # Responsive catalog dashboard (Desktop, Tablet, Mobile)
├── schemas/
│   └── menu.schemas.ts           # Zod validation schemas
├── test/
│   ├── CategorySidebar.test.tsx
│   └── MenuItemTable.test.tsx
└── types/
    └── menu.types.ts             # TypeScript domain interfaces
```

---

## 6. Security & Tenant Isolation
- **Tenant Scope Resolution**: Categories and items resolve strictly from `request.user`'s current active restaurant.
- **Cross-Tenant Category Defense**: Creating an item in Restaurant A referencing a category from Restaurant B is rejected with `ValidationError`.
- **RBAC Gating**: `Restaurant Admin` and authorized `Manager` (`menu.create`, `menu.update`, `menu.delete`, `menu.availability.manage`) have menu administration access; operational roles (`Waiter`, `Kitchen Staff`) cannot modify menu catalog data.
