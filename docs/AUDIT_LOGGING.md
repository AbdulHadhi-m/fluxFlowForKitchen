# Fluxiflow for Kitchen — Audit Logs, Activity History & Security Monitoring

---

## 1. Architecture & Domain Design
The **Audit Logging Domain** (`apps.audit` and `frontend/src/features/audit`) provides an append-only, immutable, tenant-scoped ledger recording operational actions, CRUD updates, security events, authentication records, and administrative actions across the entire restaurant platform.

```
       ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
       │  Authentication  │   │  Order / Billing │   │   Inventory / PO │
       └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
                │                      │                      │
                └──────────────────────┼──────────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │          AuditLogService          │
                     │  • Request Context (IP/UA/CorrID) │
                     │  • AuditDataSanitizer (Redactions)│
                     │  • Immutable PostgreSQL Record    │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │         AuditLog Model            │
                     │  • Immutable save() & delete()    │
                     │  • Tenant scoped (restaurant_id)  │
                     │  • Before / After JSON snapshot   │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │    Frontend Audit Ledger UI       │
                     │  • Quick Security / Domain Tabs   │
                     │  • Search & Multi-filter Controls │
                     │  • Before/After Field Diff Drawer │
                     │  • Controlled CSV Export          │
                     └───────────────────────────────────┘
```

---

## 2. Invariants & Security Guarantees
1. **Audit Logs are NOT the Domain Source of Truth**:
   - The authoritative state remains in domain models (`User`, `MenuItem`, `Order`, `Bill`, `InventoryItem`, `PurchaseOrder`).
   - Audit records serve exclusively as an immutable historical record of mutations and security events.
2. **Append-Only Immutability**:
   - Updates and deletions are rejected at the model level via `ValidationError`.
   - APIs are strictly read-only (`GET /api/v1/audit-logs/`, `GET /api/v1/audit-logs/{id}/`, `GET /api/v1/audit-logs/export/`).
3. **Sensitive Data Sanitization**:
   - `AuditDataSanitizer` automatically redacts passwords, tokens, API keys, card numbers, CVVs, and secrets from `before_data`, `after_data`, and `metadata`.
4. **Tenant Isolation**:
   - Every log record is scoped to `restaurant`. Cross-tenant queries are strictly rejected with `404 Not Found`.

---

## 3. Models (`backend/apps/audit/models.py`)

### `AuditLog`
- `id`: UUIDv4
- `restaurant`: FK to `Restaurant` (`CASCADE`, indexed)
- `actor_user`: FK to `User` (`SET_NULL`, indexed)
- `actor_email`: Email snapshot at event time
- `actor_role`: Active role snapshot
- `actor_type`: `USER` vs `SYSTEM`
- `action`: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `PASSWORD_CHANGED`, `ROLE_CHANGED`, `PERMISSION_CHANGED`, `STATUS_CHANGED`, `APPROVED`, `CANCELLED`, `PAYMENT_COMPLETED`, `PAYMENT_FAILED`, `STOCK_ADJUSTED`, `STOCK_RECEIVED`, `STOCK_WASTED`, `EXPORT`.
- `entity_type`: `USER`, `STAFF`, `RESTAURANT`, `ROLE`, `MENU_ITEM`, `MENU_CATEGORY`, `TABLE`, `ORDER`, `BILL`, `PAYMENT`, `INVENTORY_ITEM`, `STOCK_MOVEMENT`, `SUPPLIER`, `PURCHASE_ORDER`, `NOTIFICATION`, `REPORT`.
- `entity_id`: String identifier of modified entity
- `description`: Textual summary
- `before_data`: Sanitized JSON snapshot
- `after_data`: Sanitized JSON snapshot
- `metadata`: Sanitized contextual payload
- `ip_address`: Client IP (parsed safely from proxy headers or remote addr)
- `user_agent`: Truncated user-agent string
- `correlation_id`: Request correlation ID
- `created_at`: Datetime auto-indexed

---

## 4. API Endpoints (`/api/v1/audit-logs/`)

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/audit-logs/` | Filterable, paginated audit log stream | `audit.view` |
| `GET` | `/api/v1/audit-logs/{id}/` | Audit entry detail with before/after state diff | `audit.view` |
| `GET` | `/api/v1/audit-logs/export/` | Controlled CSV export of audit logs | `audit.view` |

---

## 5. Frontend Feature (`src/features/audit/`)
```
frontend/src/features/audit/
├── api/
│   └── audit.api.ts             # Typed Axios API client
├── components/
│   ├── AuditActionBadge.tsx     # Color-coded action indicator
│   ├── AuditDetailModal.tsx     # Detail drawer modal with request metadata
│   └── AuditDiffViewer.tsx      # Field-level Before vs After visual diff
├── hooks/
│   └── useAuditLogs.ts          # TanStack Query hook and CSV export mutation
├── pages/
│   └── AuditLogsPage.tsx        # Security & Audit Logs ledger page
├── test/
│   ├── AuditActionBadge.test.tsx
│   └── AuditDiffViewer.test.tsx
└── types/
    └── audit.types.ts           # TypeScript interfaces
```
