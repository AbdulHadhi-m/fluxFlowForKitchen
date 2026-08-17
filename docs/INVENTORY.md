# Fluxiflow for Kitchen — Inventory & Stock Management

---

## 1. Architecture & Domain Design
The **Inventory Domain** is an isolated business module managing raw materials, stock movement ledgers, intake receiving, manual adjustments, spoilage wastage, and automated order recipe ingredient consumption.

```
                  ┌──────────────────────┐
                  │    Inventory Item    │
                  │  • current_quantity  │
                  │  • minimum_stock     │
                  │  • unit (kg, g, etc.)│
                  └──────────▲───────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
       ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌───────────────────┐
│Stock Intake  │     │ Manual Audit │     │   Order Recipe    │
│  (PURCHASE)  │     │ (ADJUSTMENT) │     │   (CONSUMPTION)   │
└──────────────┘     └──────────────┘     └───────────────────┘
```

---

## 2. Core Business Invariants
1. **Authoritative Movement Ledger**:
   - Stock balance is never arbitrarily overwritten.
   - Every stock alteration generates an immutable `StockMovement` row tracking `WHO`, `WHAT`, `WHEN`, `WHY`, and `HOW MUCH`.
2. **Atomic Row Locking & Concurrency Protection**:
   - Every mutation performs `InventoryItem.objects.select_for_update().get(id=item.id)` inside `transaction.atomic()`.
3. **Idempotent Order Consumption**:
   - When an order reaches `COMPLETED`, `InventoryService.consume_stock_for_order(order)` checks `InventoryConsumption(order=order)`. Deductions occur at most once.
4. **Order Cancellation Compensation**:
   - When an order is `CANCELLED`, `InventoryService.reverse_order_consumption(order)` issues compensating `RETURN` movements without erasing historical consumption records.
5. **Accurate Quantized Arithmetic**:
   - All quantities use `DecimalField(max_digits=12, decimal_places=3)` and `ROUND_HALF_UP` quantization.

---

## 3. Models (`backend/apps/inventory/models.py`)

### `InventoryItem`
- `restaurant`: Tenant reference (`Restaurant`).
- `name`: Raw material title.
- `sku`: Barcode / SKU identifier.
- `unit`: `kg`, `g`, `l`, `ml`, `piece`, `pack`, `bottle`, `box`.
- `current_quantity`: Authoritative cached stock balance.
- `minimum_stock_level`: Low stock threshold.
- `cost_per_unit`: Unit acquisition cost.
- `is_active`: Soft-deactivation flag.
- `stock_status`: Computed property (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`).

### `StockMovement`
- `movement_type`: `OPENING`, `PURCHASE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `CONSUMPTION`, `WASTAGE`, `RETURN`.
- `quantity`: Signed delta applied.
- `quantity_before` & `quantity_after`: Balance snapshot.
- `reference_type` & `reference_id`: Context tag (e.g. `ORDER`, `ORD-000001`).
- `reason`: Explanation or wastage category.
- `created_by`: Staff member who executed the action.

### `Recipe` & `RecipeItem` (BOM)
- `Recipe`: Maps 1:1 with catalog `MenuItem`.
- `RecipeItem`: Ingredient requirement (`inventory_item`, `quantity`, `unit`).

### `InventoryConsumption`
- Uniqueness token tracking order-level recipe stock deduction (`order_id`, `status`).

---

## 4. API Endpoints (`/api/v1/inventory/`)

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inventory/items/` | List stock catalog with search & low-stock filter | `inventory.view` |
| `POST` | `/api/v1/inventory/items/` | Create raw material item with initial stock | `inventory.update` |
| `GET` | `/api/v1/inventory/items/{id}/` | Item details | `inventory.view` |
| `PATCH` | `/api/v1/inventory/items/{id}/` | Update item name, sku, thresholds | `inventory.update` |
| `POST` | `/api/v1/inventory/items/{id}/receive/` | Record stock intake delivery | `inventory.update` |
| `POST` | `/api/v1/inventory/items/{id}/adjust/` | Record positive/negative stock adjustment | `inventory.update` |
| `POST` | `/api/v1/inventory/items/{id}/waste/` | Record spoilage / wastage deduction | `inventory.update` |
| `GET` | `/api/v1/inventory/movements/` | List immutable stock audit ledger | `inventory.view` |
| `GET` | `/api/v1/inventory/recipes/` | List menu item recipes | `inventory.view` |
| `POST` | `/api/v1/inventory/recipes/` | Configure menu item recipe & ingredients | `inventory.manage` |

---

## 5. Frontend Feature Architecture (`src/features/inventory/`)
```
frontend/src/features/inventory/
├── api/
│   └── inventory.api.ts            # Typed Axios API methods
├── components/
│   ├── AdjustStockModal.tsx        # Manual stock delta dialog
│   ├── CreateInventoryItemModal.tsx# Ingredient creation dialog
│   ├── ReceiveStockModal.tsx       # Intake receipt modal
│   ├── StockStatusBadge.tsx        # Semantic badge (In Stock, Low Stock, Out of Stock)
│   └── WastageModal.tsx            # Spoilage deduction modal
├── hooks/
│   └── useInventory.ts             # TanStack Query queries and mutations
├── pages/
│   ├── InventoryListPage.tsx       # Inventory catalog & quick stock operations
│   └── StockMovementsPage.tsx      # Immutable audit trail ledger
├── schemas/
│   └── inventory.schemas.ts        # Zod validation schemas
├── test/
│   ├── ReceiveStockModal.test.tsx
│   └── StockStatusBadge.test.tsx
└── types/
    └── inventory.types.ts          # TypeScript interfaces
```

---

## 6. Automation Integration

Inventory signals drive the workflow engine:

- `INVENTORY_LOW` / `INVENTORY_OUT` events are published by the scheduled detection task (`detect_low_stock`) when `quantity_on_hand` falls to/below `par_level`.
- The `LOW_STOCK_REORDER` template creates a purchase requisition for the low item at par level; conditions can reference `inventory_item.quantity_on_hand` and `inventory_item.par_level`.
- See [AUTOMATION.md](AUTOMATION.md) and [BUSINESS_RULES.md](BUSINESS_RULES.md).
