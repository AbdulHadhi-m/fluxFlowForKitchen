# Fluxiflow for Kitchen — Supplier & Purchase Order Management

---

## 1. Architecture & Domain Design
The **Procurement Domain** (`apps.procurement`) manages upstream raw material supply chain workflows: vendor supplier management, purchase orders (PO), managerial approvals, and physical delivery receipts into inventory stock.

```
       ┌──────────────────┐
       │     Supplier     │
       └────────┬─────────┘
                │
                ▼
       ┌───────────────────────────────────────────────────────────┐
       │                       Purchase Order                      │
       │  • po_number: PO-000001 (Sequential per restaurant)       │
       │  • status: DRAFT | SUBMITTED | APPROVED                   │
       │            PARTIALLY_RECEIVED | RECEIVED | CANCELLED      │
       │                                                           │
       │   ┌───────────────────────────────────────────────────┐   │
       │   │                PurchaseOrderItem                  │   │
       │   │  • inventory_item: FK to apps.inventory           │   │
       │   │  • quantity_ordered vs quantity_received          │   │
       │   │  • remaining_quantity = ordered - received        │   │
       │   └───────────────────────────────────────────────────┘   │
       └────────────────────────┬──────────────────────────────────┘
                                │
                                │ POST /api/v1/procurement/purchase-orders/{id}/receive/
                                ▼
       ┌───────────────────────────────────────────────────────────┐
       │                      Purchase Receipt                     │
       │  • receipt_number: REC-000001                             │
       │  • idempotency_key: Client deduplication token            │
       │  • Calls apps.inventory.services.InventoryService         │
       │    .receive_stock(item, qty, reference=PO-000001)         │
       └───────────────────────────────────────────────────────────┘
```

---

## 2. Core Business Invariants
1. **Clean Domain Boundary**:
   - Procurement manages purchasing contracts and order quantities.
   - Inventory manages stock balances and immutable movement ledgers.
   - Receiving goods transactionally delegates to `apps.inventory.services.InventoryService.receive_stock(...)`.
2. **Controlled Lifecycle State Machine**:
   - `DRAFT` ➔ `SUBMITTED` ➔ `APPROVED` ➔ `PARTIALLY_RECEIVED` ➔ `RECEIVED`
   - Non-received POs can transition to `CANCELLED`.
3. **No Over-Receiving**:
   - Cumulative `quantity_received` across all intake batches cannot exceed `quantity_ordered`.
4. **Concurrency Safety & Row-Locking**:
   - `select_for_update()` locks `PurchaseOrder`, `PurchaseOrderItem`, and target `InventoryItem` records.
5. **Idempotent Delivery Intake**:
   - Duplicate receipt submissions with the same `idempotency_key` return the original receipt without double-crediting stock.

---

## 3. Models (`backend/apps/procurement/models.py`)

### `Supplier`
- `restaurant`: FK to `Restaurant`.
- `supplier_code`: `SUP-000001` (unique per restaurant).
- `name`, `contact_person`, `email`, `phone`, `address`, `notes`, `is_active`.

### `PurchaseOrder`
- `restaurant`: FK to `Restaurant`.
- `supplier`: FK to `Supplier` (`on_delete=PROTECT`).
- `po_number`: `PO-000001` (unique per restaurant).
- `status`: `DRAFT`, `SUBMITTED`, `APPROVED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`.
- `subtotal`, `tax_amount`, `total_amount`, `order_date`, `expected_delivery_date`.
- `created_by`, `approved_by`, `approved_at`.

### `PurchaseOrderItem`
- `purchase_order`: FK to `PurchaseOrder`.
- `inventory_item`: FK to `InventoryItem` (`on_delete=PROTECT`).
- `item_name_snapshot`: Preserves name at time of order creation.
- `quantity_ordered`, `quantity_received`, `unit`, `unit_cost`, `line_total`.
- `remaining_quantity`: `max(0, quantity_ordered - quantity_received)`.

### `PurchaseReceipt` & `PurchaseReceiptItem`
- Physical delivery batch record tracking intake events (`receipt_number: REC-000001`, `idempotency_key`, `received_by`).

---

## 4. API Endpoints (`/api/v1/procurement/`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/procurement/suppliers/` | List vendors | `procurement.view` |
| `POST` | `/api/v1/procurement/suppliers/` | Register new supplier | `procurement.manage` |
| `GET` | `/api/v1/procurement/suppliers/{id}/`| Supplier details | `procurement.view` |
| `PATCH`| `/api/v1/procurement/suppliers/{id}/`| Update vendor details | `procurement.manage` |
| `GET` | `/api/v1/procurement/purchase-orders/` | List purchase orders with filters | `procurement.view` |
| `POST` | `/api/v1/procurement/purchase-orders/` | Create draft purchase order | `procurement.create` |
| `GET` | `/api/v1/procurement/purchase-orders/{id}/` | PO details with line items & receipts | `procurement.view` |
| `POST` | `/api/v1/procurement/purchase-orders/{id}/submit/` | Submit PO for approval | `procurement.manage` |
| `POST` | `/api/v1/procurement/purchase-orders/{id}/approve/`| Managerial PO approval | `procurement.approve` |
| `POST` | `/api/v1/procurement/purchase-orders/{id}/cancel/` | Cancel unfulfilled PO | `procurement.manage` |
| `POST` | `/api/v1/procurement/purchase-orders/{id}/receive/`| Receive goods & update stock | `procurement.receive` |

---

## 5. Frontend Feature Architecture (`src/features/procurement/`)
```
frontend/src/features/procurement/
├── api/
│   └── procurement.api.ts            # Typed Axios API client
├── components/
│   ├── CreatePOModal.tsx             # Multi-item PO draft builder
│   ├── CreateSupplierModal.tsx       # Vendor registration dialog
│   ├── POStatusBadge.tsx             # Lifecycle state badges
│   └── ReceiveGoodsModal.tsx         # Physical intake delivery dialog
├── hooks/
│   └── useProcurement.ts             # TanStack Query queries and mutations
├── pages/
│   ├── PurchaseOrderListPage.tsx     # Procurement terminal & order manager
│   └── SupplierListPage.tsx          # Vendor directory
├── schemas/
│   └── procurement.schemas.ts        # Zod validation schemas
├── test/
│   ├── CreateSupplierModal.test.tsx
│   └── POStatusBadge.test.tsx
└── types/
    └── procurement.types.ts          # TypeScript interfaces
```

---

## 6. Automation Integration

Procurement emits domain events consumed by the workflow engine:

- `PURCHASE_ORDER_CREATED` / `PURCHASE_ORDER_RECEIVED` are published (transaction.on_commit) from `create_purchase_order` / `receive_goods`.
- The `LARGE_PURCHASE_APPROVAL` template gates large POs with a RESTAURANT_ADMIN approval step; `CREATE_PURCHASE_REQUEST` / `CREATE_DRAFT_PURCHASE_ORDER` actions orchestrate requisitions and draft POs.
- Conditions can reference `purchase_order.status` / payload amounts.
- See [AUTOMATION.md](AUTOMATION.md) and [WORKFLOW_ACTIONS.md](WORKFLOW_ACTIONS.md).
