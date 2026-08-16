# Fluxiflow for Kitchen — Billing, Invoicing & Payment Management

---

## 1. Domain Architecture
The **Billing Domain** governs customer invoicing, tax and discount computations, and tender settlement (Cash, Card, UPI, Split Tender) while strictly preserving immutable point-of-sale financial records.

```
       ┌──────────────────┐
       │   Customer Order │
       └────────┬─────────┘
                │ POST /api/v1/billing/bills/
                ▼
       ┌───────────────────────────────────────────────────────────┐
       │                        Bill Record                        │
       │  • bill_number: BILL-000001 (Sequential per restaurant)   │
       │  • status: DRAFT | FINALIZED | PARTIALLY_PAID | PAID | VOID│
       │  • subtotal: Sum of BillItem line totals                  │
       │  • discount: % or fixed deduction                        │
       │  • service_charge: configured %                           │
       │  • tax_rate_snapshot: e.g. 5.00% VAT snapshot             │
       │  • grand_total = subtotal - discount + svc + tax          │
       │  • total_paid & balance_due                               │
       │                                                           │
       │   ┌───────────────────────────────────────────────────┐   │
       │   │                     BillItem                      │   │
       │   │  • item_name_snapshot: "Risotto"                  │   │
       │   │  • unit_price_snapshot: $25.00                    │   │
       │   │  • quantity: 2                                    │   │
       │   │  • line_total: $50.00                             │   │
       │   └───────────────────────────────────────────────────┘   │
       └────────────────────────┬──────────────────────────────────┘
                                │
                                │ POST /api/v1/billing/bills/{id}/payments/
                                ▼
       ┌───────────────────────────────────────────────────────────┐
       │                      Payment Receipt                      │
       │  • payment_method: CASH | CARD | UPI | BANK_TRANSFER      │
       │  • amount: Applied towards bill balance                   │
       │  • amount_tendered: Gross cash given                      │
       │  • change_returned: amount_tendered - amount              │
       │  • idempotency_key: Client deduplication token            │
       └───────────────────────────────────────────────────────────┘
```

---

## 2. Core Models (`backend/apps/billing/models.py`)

### `Bill`
- **Primary Identifier**: UUIDv4 (`id`)
- **Human-Readable Number**: `bill_number` (e.g. `BILL-000001`), unique per restaurant via `UniqueConstraint(fields=["restaurant", "bill_number"])`.
- **Tenant Scope**: ForeignKey to `Restaurant` (`related_name="bills"`).
- **Source Order**: ForeignKey to `Order` (`on_delete=models.PROTECT`).
- **Status State Machine**:
  - `DRAFT` ➔ `FINALIZED` ➔ `PARTIALLY_PAID` ➔ `PAID`
  - `DRAFT` / `FINALIZED` / `PARTIALLY_PAID` ➔ `VOID`
- **Immutable Financial Totals**:
  - `subtotal`: `DecimalField(max_digits=12, decimal_places=2)`.
  - `discount_type`: `NONE`, `PERCENTAGE`, `FIXED`.
  - `discount_amount`: Computed currency deduction.
  - `service_charge_amount`: Computed service fee.
  - `tax_rate_snapshot`: Tax percentage active at time of billing.
  - `tax_amount`: Computed tax currency amount.
  - `grand_total`: Net payable total.
  - `total_paid`: Cumulative sum of settled payments.
  - `balance_due`: Unpaid balance (`grand_total - total_paid`).

### `BillItem`
- **Primary Identifier**: UUIDv4 (`id`)
- **Bill Reference**: ForeignKey to `Bill` (`related_name="items"`).
- **Frozen Snapshots**:
  - `item_name_snapshot` (CharField)
  - `unit_price_snapshot` (DecimalField)
  - `quantity` (Positive integer >= 1)
  - `line_total` (unit_price_snapshot * quantity)

### `Payment`
- **Primary Identifier**: UUIDv4 (`id`)
- **Tenant Scope**: ForeignKey to `Restaurant`.
- **Bill Reference**: ForeignKey to `Bill` (`related_name="payments"`).
- **Payment Method**: `CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `OTHER`.
- **Settlement Amounts**:
  - `amount`: Applied to reduce bill balance.
  - `amount_tendered`: Actual customer cash input.
  - `change_returned`: Computed cash change returned to customer.
- **Idempotency**: `idempotency_key` indexed token preventing double-billing on network retry.

---

## 3. Monetary Precision & Rounding Rules
- All monetary arithmetic uses Python `Decimal` and PostgreSQL `DecimalField(max_digits=12, decimal_places=2)`.
- Explicit Banker's Rounding (`ROUND_HALF_UP`) quantizes values to 2 decimal places.
- Backend is strictly authoritative: client totals are never trusted.

---

## 4. Concurrency Protection & Idempotency
- **Row Locking**: When processing a payment, `Bill.objects.select_for_update().get(id=bill.id)` locks the target bill row inside `transaction.atomic()`, preventing concurrent cashiers from causing overpayments or corrupted ledger balances.
- **Idempotency Token**: If a request passes an `idempotency_key`, any duplicate submission returns the original payment record immediately.

---

## 5. API Endpoints (`/api/v1/billing/`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/billing/bills/` | List bills with search & status filters | `billing.view` |
| `POST` | `/api/v1/billing/bills/` | Generate bill from order with discounts | `billing.create` |
| `GET` | `/api/v1/billing/bills/{id}/` | Get bill detail with snapshots & payments | `billing.view` |
| `POST` | `/api/v1/billing/bills/{id}/payments/`| Settle payment (Cash, Card, UPI, Split) | `billing.payment.create` |
| `POST` | `/api/v1/billing/bills/{id}/void/` | Void active bill | `billing.void` |
| `GET` | `/api/v1/billing/eligible-orders/`| List unbilled active orders | `billing.view` |
| `GET` | `/api/v1/billing/tax-rules/` | List restaurant tax rules | `settings.view` |
| `POST` | `/api/v1/billing/tax-rules/` | Create restaurant tax rule | `settings.manage` |

---

## 6. Frontend Billing Architecture (`src/features/billing/`)
```
frontend/src/features/billing/
├── api/
│   └── billing.api.ts            # Typed Axios API methods
├── components/
│   ├── BillStatusBadge.tsx       # Semantic status badges
│   ├── CreateBillModal.tsx       # Bill generator from eligible orders
│   ├── PaymentModal.tsx          # Multi-tender & cash change settlement dialog
│   └── ReceiptModal.tsx          # Printable tax invoice receipt modal
├── hooks/
│   └── useBilling.ts             # TanStack Query queries and settlement mutations
├── pages/
│   ├── BillingDashboardPage.tsx  # POS Cashier Register terminal
│   └── BillingHistoryPage.tsx    # Filterable invoice ledger & receipt archive
├── schemas/
│   └── billing.schemas.ts        # Zod validation schemas
├── test/
│   ├── CreateBillModal.test.tsx
│   └── PaymentModal.test.tsx
└── types/
    └── billing.types.ts          # TypeScript domain interfaces
```
