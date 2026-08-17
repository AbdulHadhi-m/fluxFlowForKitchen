# Fluxiflow for Kitchen — Reports, Analytics & Business Dashboard

---

## 1. Core Principles & Architecture
The **Reports Domain** (`apps.reports`) provides non-mutating, read-only analytics, financial summaries, and operational insights derived directly from authoritative transactional domains:

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   apps.orders   │   │  apps.billing   │   │ apps.inventory  │   │apps.procurement │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │                     │
         └─────────────────────┼─────────────────────┼─────────────────────┘
                               │
                               ▼
            ┌─────────────────────────────────────────┐
            │        apps.reports.services            │
            │   • ReportService                       │
            │   • DateFilterHelper                    │
            │   • Database-Level Aggregation          │
            │     (Sum, Count, Avg, TruncDate)        │
            └──────────────────┬──────────────────────┘
                               │
                               ▼
            ┌─────────────────────────────────────────┐
            │          /api/v1/reports/               │
            │  • /dashboard/                          │
            │  • /sales/                              │
            │  • /payments/                           │
            │  • /menu/popular/                       │
            └─────────────────────────────────────────┘
```

### Invariants:
1. **Single Source of Truth**:
   - Reports **never** duplicate or store separate snapshot tables.
   - Sales figures aggregate directly from `Bill` & `Payment`.
   - Popular items aggregate directly from `OrderItem` historical snapshots.
   - Stock movements aggregate from `StockMovement`.
   - Purchasing metrics aggregate from `PurchaseOrder`.
2. **Database-Level SQL Aggregation**:
   - Computations use PostgreSQL aggregate functions (`Sum`, `Count`, `Avg`, `TruncDate`, `Coalesce`) without loading full result sets into Python memory.
3. **Tenant Scoping & RBAC**:
   - Every selector enforces `restaurant=restaurant`.
   - Access controlled by `reports.view`.

---

## 2. Metrics & KPI Definitions

| Metric | Source Domain & Formula | Description |
| :--- | :--- | :--- |
| **Gross Sales** | `Sum(Bill.subtotal)` | Raw sales before taxes, discounts, or service charges |
| **Discounts** | `Sum(Bill.discount_amount)` | Deductions and promotional discounts applied |
| **Taxes** | `Sum(Bill.tax_amount)` | Aggregated sales tax |
| **Net Revenue** | `Sum(Bill.grand_total)` | Total invoice value payable by patrons |
| **Paid Amount** | `Sum(Bill.total_paid)` | Settled funds received across all tender types |
| **Balance Due** | `Sum(Bill.balance_due)` | Unsettled or pending invoice amounts |
| **Average Order Value**| `Net Revenue / Total Bills` | Mean revenue generated per issued bill |
| **Popular Dishes** | `OrderItem.item_name_snapshot` | Ranked by `Sum(quantity)` and historical `Sum(quantity * unit_price_snapshot)` |

---

## 3. Date Presets & Timezone Handling
Supported date filtering presets via `DateFilterHelper`:
- `TODAY`: `[00:00:00, 23:59:59]` local restaurant time.
- `YESTERDAY`: Previous calendar day `[00:00:00, 23:59:59]`.
- `LAST_7_DAYS`: Rolling 7-day window.
- `LAST_30_DAYS`: Rolling 30-day window.
- `THIS_MONTH`: First day of current month to current timestamp.
- `CUSTOM`: Validated ISO `start_date` and `end_date`.

---

## 4. API Endpoints (`/api/v1/reports/`)

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/dashboard/` | Single-flight executive summary payload | `reports.view` |
| `GET` | `/api/v1/reports/sales/` | Gross/net sales, discounts, taxes & daily revenue trends | `reports.view` |
| `GET` | `/api/v1/reports/payments/` | Tender breakdown (`CASH`, `CARD`, `UPI`, etc.) | `reports.view` |
| `GET` | `/api/v1/reports/menu/popular/` | Best-selling dishes ranked by quantity & historical revenue | `reports.view` |

---

## 5. Frontend Reporting Architecture (`src/features/reports/`)
```
frontend/src/features/reports/
├── api/
│   └── reports.api.ts                # Typed Axios client
├── components/
│   ├── DateRangePicker.tsx           # Preset & custom date range picker
│   ├── PaymentBreakdownCard.tsx      # Tender distribution with progress bars
│   ├── PopularItemsTable.tsx         # Best-selling dishes ranking table
│   ├── SalesKPICard.tsx              # Executive metric card
│   └── SalesTrendChart.tsx           # CSS-gradient daily revenue bar trend
├── hooks/
│   └── useReports.ts                 # TanStack Query query hook
├── pages/
│   └── ReportsDashboardPage.tsx      # Executive business dashboard
├── test/
│   ├── DateRangePicker.test.tsx
│   └── SalesKPICard.test.tsx
└── types/
    └── reports.types.ts              # TypeScript interfaces
```

---

## 6. Automation Analytics

The automation subsystem ships its own analytics surface (`/automation/analytics`) covering execution success rates, average durations, retries, pending approvals, escalations, most-used workflows, and action failure hotspots — see [AUTOMATION_ANALYTICS.md](AUTOMATION_ANALYTICS.md).
