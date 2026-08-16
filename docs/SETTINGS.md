# Fluxiflow for Kitchen — Settings, Configuration & System Administration

---

## 1. Architecture & Configuration Ownership
The **Settings and Configuration Domain** (`apps.settings` and `frontend/src/features/settings`) implements structured, domain-scoped operational policies and user preferences:

```
                  ┌─────────────────────────────────────┐
                  │      Restaurant Tenant Boundary     │
                  └──────────────────┬──────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│  Restaurant Profile │   │ Operational Policies│   │   User Preferences  │
│  • Legal name       │   │  • Tax & Billing    │   │  • Dark/Light Theme │
│  • Timezone (IANA)  │   │  • KDS Thresholds   │   │  • 12H / 24H clock  │
│  • Currency (ISO)   │   │  • Order rules      │   │  • Table density    │
│  • Business Hours   │   │  • PO approval caps │   │                     │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

---

## 2. Invariants & Business Rules
1. **Configuration Ownership**:
   - Platform infrastructure (JWT secrets, PostgreSQL connection strings, Redis URI) is never exposed via settings endpoints.
   - Tenant operational rules belong to `RestaurantConfiguration`.
   - User display preferences belong to `UserPreference`.
2. **Cross-Setting Validation**:
   - `kds_critical_threshold_minutes >= kds_warning_threshold_minutes`.
   - `default_tax_rate >= 0.00%`.
   - `po_approval_threshold >= 0.00`.
3. **Audit Integration**:
   - Every modification to `RestaurantConfiguration` automatically emits an `UPDATE` event into the immutable `AuditLog` ledger with before and after field snapshots.
4. **Tenant Isolation**:
   - Scoped strictly to the authenticated user's current `restaurant`. Cross-tenant mutations are blocked.

---

## 3. Models (`backend/apps/settings/models.py`)

### `RestaurantConfiguration`
- `restaurant`: OneToOneField to `Restaurant`.
- **Order Rules**: `allow_order_cancellation`, `cancellation_window_minutes`, `require_order_confirmation`, `allow_table_orders`, `allow_takeaway`.
- **KDS Parameters**: `default_prep_time_minutes`, `kds_warning_threshold_minutes`, `kds_critical_threshold_minutes`, `auto_refresh_interval_seconds`.
- **Tax & Billing**: `tax_enabled`, `default_tax_rate`, `tax_name`, `tax_registration_number`, `tax_inclusive_pricing`, `invoice_prefix`, `receipt_prefix`, `invoice_footer_notes`.
- **Inventory & Stock**: `allow_negative_stock`, `require_wastage_reason`, `low_stock_threshold_default`.
- **Procurement**: `po_approval_required`, `po_approval_threshold`, `default_delivery_lead_days`.

### `UserPreference`
- `user`: OneToOneField to `User`.
- `theme`: `DARK`, `LIGHT`, `SYSTEM`.
- `time_format`: `12H`, `24H`.
- `date_format`: String format pattern (e.g. `DD/MM/YYYY`).
- `table_density`: `COMPACT`, `COMFORTABLE`.

---

## 4. API Endpoints (`/api/v1/settings/`)

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/settings/restaurant/` | Retrieve restaurant profile | Authenticated |
| `PATCH` | `/api/v1/settings/restaurant/` | Update restaurant profile & location | `settings.update` |
| `GET` | `/api/v1/settings/operational/` | Retrieve operational policies & taxes | Authenticated |
| `PATCH` | `/api/v1/settings/operational/` | Update operational policies & taxes | `settings.update` |
| `GET` | `/api/v1/settings/preferences/` | Get current user's UI preferences | Authenticated |
| `PATCH` | `/api/v1/settings/preferences/` | Update current user's UI preferences | Authenticated |

---

## 5. Frontend Feature (`src/features/settings/`)
```
frontend/src/features/settings/
├── api/
│   └── settings.api.ts             # Typed Axios client
├── components/
│   ├── OperationalPoliciesForm.tsx # Tax, KDS, Order, PO configuration
│   └── UserPreferencesForm.tsx     # Theme, clock format, grid density
├── hooks/
│   └── useSettings.ts              # TanStack Query query & mutations
├── pages/
│   └── SettingsPage.tsx            # Central Settings hub
├── test/
│   ├── OperationalPoliciesForm.test.tsx
│   └── UserPreferencesForm.test.tsx
└── types/
    └── settings.types.ts           # TypeScript interfaces
```
