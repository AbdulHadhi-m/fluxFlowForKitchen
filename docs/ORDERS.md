# Fluxiflow for Kitchen — Order Management & POS Workflow

---

## 1. Domain Overview
The **Order Management** domain handles the restaurant point-of-sale (POS) ticket lifecycle, connecting staff servers, physical dining tables, and catalog menu items into atomic billable orders.

---

## 2. Core Models (`backend/apps/orders/models.py`)

### `Order`
- **Primary Identifier**: UUIDv4 (`id`)
- **Human-Readable Number**: `order_number` (e.g. `ORD-000001`), guaranteed unique per restaurant via `UniqueConstraint(fields=["restaurant", "order_number"])`.
- **Tenant Scope**: ForeignKey to `Restaurant` (`related_name="orders"`).
- **Dining Table**: ForeignKey to `RestaurantTable` (`null=True, blank=True` for takeaway/direct counter orders).
- **Server Attribution**: `created_by` ForeignKey to `User` (`on_delete=models.PROTECT`).
- **Monetary Totals**:
  - `subtotal`: `DecimalField(max_digits=12, decimal_places=2)`. Sum of all item line totals.
  - `total`: `DecimalField(max_digits=12, decimal_places=2)`. Payable ticket amount.
- **Operational Lifecycle**: `status` (`DRAFT`, `PLACED`, `COMPLETED`, `CANCELLED`).

### `OrderItem`
- **Primary Identifier**: UUIDv4 (`id`)
- **Order Relationship**: ForeignKey to `Order` (`related_name="items"`).
- **Catalog Reference**: ForeignKey to `MenuItem` (`null=True, on_delete=models.SET_NULL`).
- **Immutable Snapshots**:
  - `item_name_snapshot` (CharField): Exact item name at order placement.
  - `unit_price_snapshot` (DecimalField): Exact unit price at order placement.
- **Line Quantity**: `quantity` (Positive integer >= 1).
- **Line Total**: `line_total = unit_price_snapshot * quantity`.
- **Preparation Notes**: `notes` (e.g. "No onions", "Gluten-free").

---

## 3. Price & Name Snapshot Architecture (Historical Preservation)
> **Core Architectural Rule**: When an `OrderItem` is created, `MenuItem.name` and `MenuItem.price` are immutably copied to `item_name_snapshot` and `unit_price_snapshot`. If the restaurant subsequently renames or increases prices on catalog items, historical sales invoices and order tickets remain completely unchanged.

---

## 4. Order State Machine & Transitions

```
               ┌────────┐
               │ DRAFT  ├────────┐
               └───┬────┘        │
                   │             │
                   ▼             ▼
               ┌────────┐   ┌───────────┐
               │ PLACED ├──►│ CANCELLED │
               └───┬────┘   └───────────┘
                   │
                   ▼
             ┌───────────┐
             │ COMPLETED │
             └───────────┘
```

- **Valid Transitions**:
  - `DRAFT` ➔ `PLACED` ➔ `COMPLETED`
  - `DRAFT` ➔ `CANCELLED`
  - `PLACED` ➔ `CANCELLED`
- **Invalid Transitions**:
  - `COMPLETED` ➔ Any (Terminal)
  - `CANCELLED` ➔ Any (Terminal)

---

## 5. Dining Table Occupancy Synchronization
- When an order transitions to `PLACED` on an active table, the table status automatically updates to `OCCUPIED`.
- When an order transitions to `COMPLETED` or `CANCELLED`, the system checks whether any other active `PLACED` orders exist on that table. If none remain, the table status automatically returns to `AVAILABLE`.

---

## 6. API Endpoints (`/api/v1/orders/`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/orders/` | List orders with search, status, and table filtering | `orders.view` |
| `POST` | `/api/v1/orders/` | Create a new order with items and price snapshots | `orders.create` |
| `GET` | `/api/v1/orders/{id}/` | Get order detail with item snapshots and line totals | `orders.view` |
| `POST` | `/api/v1/orders/{id}/cancel/` | Void / cancel an order and sync table availability | `orders.cancel` |
| `POST` | `/api/v1/orders/{id}/complete/` | Mark order completed and sync table availability | `orders.complete` |
| `POST` | `/api/v1/orders/{id}/items/` | Add an item to an editable DRAFT order | `orders.update` |
| `PATCH`| `/api/v1/orders/{id}/items/{item_id}/` | Update quantity or notes on draft item | `orders.update` |
| `DELETE`| `/api/v1/orders/{id}/items/{item_id}/` | Remove item from draft order | `orders.update` |

---

## 7. Frontend POS Architecture (`src/features/orders/`)
```
frontend/src/features/orders/
├── api/
│   └── order.api.ts              # Typed Axios API methods
├── components/
│   ├── OrderReceiptModal.tsx     # Order confirmation & receipt dialog
│   ├── OrderStatusBadge.tsx      # Semantic status badge (DRAFT, PLACED, COMPLETED, CANCELLED)
│   ├── PosCartPanel.tsx          # Real-time ticket cart with quantity buttons and subtotal
│   ├── PosCategoryNav.tsx        # Menu category tabs
│   ├── PosMenuItemGrid.tsx       # Fast-tap menu catalog item grid
│   └── PosTableSelector.tsx      # Table selection dropdown
├── hooks/
│   └── useOrders.ts              # TanStack Query query and mutation hooks
├── pages/
│   ├── OrderHistoryPage.tsx      # Filterable orders ledger with complete/cancel actions
│   └── PosTerminalPage.tsx       # Fullscreen responsive POS ordering terminal
├── schemas/
│   └── order.schemas.ts          # Zod validation schemas
├── store/
│   └── posCartStore.ts           # Zustand store for temporary client POS cart state
├── test/
│   ├── PosCartPanel.test.tsx
│   └── posCartStore.test.ts
└── types/
    └── order.types.ts            # TypeScript domain interfaces
```
