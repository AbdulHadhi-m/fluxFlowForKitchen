# Fluxiflow for Kitchen — Customer Management, Reservations & CRM Foundation

---

## 1. Architecture & CRM Domain Design
The **Customer Management & CRM Domain** (`apps.customers` and `frontend/src/features/customers/`) establishes guest profiles, dining history, preferences, and table bookings:

```
                  ┌────────────────────────────────────────┐
                  │      Customer Profile (`Customer`)     │
                  │  • Contact: Name, Phone, Email         │
                  │  • Preferences: Table, Diet, Allergies │
                  │  • Aggregates: Total Spend & Visits    │
                  └──────────────┬──────────────────┬──────┘
                                 │                  │
                ┌────────────────┴────┐        ┌────┴─────────────────┐
                ▼                     │        ▼                      │
      ┌────────────────────┐          │  ┌─────────────────────────┐  │
      │ CustomerTag        │          │  │ Reservation             │  │
      │ • VIP, Regular     │          │  │ • Table Assignment      │  │
      │ • Corporate        │          │  │ • Conflict Detection    │  │
      └────────────────────┘          │  │ • Status: Confirmed,    │  │
                                      │  │   Checked In, Cancelled │  │
                                      ▼  └─────────────────────────┘  │
                           ┌────────────────────────┐                 ▼
                           │ CustomerVisit          │      ┌─────────────────────┐
                           │ • Order Ref / Bill Ref │      │ CRM Analytics       │
                           │ • Spend / Party Size   │      │ • Repeat Rate %     │
                           └────────────────────────┘      │ • Avg Guest Spend   │
                                                           └─────────────────────┘
```

---

## 2. Invariants & Business Rules
1. **Uniqueness & Tenant Isolation**:
   - Phone numbers are unique per restaurant (`models.UniqueConstraint(fields=["restaurant", "phone"])`).
   - Reservation numbers are sequential and unique per restaurant (`RES-YYYYMMDD-###`).
2. **Conflict & Capacity Validation**:
   - Table bookings validate that `table.capacity >= reservation.party_size`.
   - Double-booking prevention blocks conflicting reservations for the same table and time slot.
3. **Dining Visit Logging & CRM Aggregates**:
   - Checking in a reservation or settling an order automatically records a `CustomerVisit` entry and increments `total_visits`, `total_spend`, and updates `last_visit_at`.
4. **Duplicate Customer Merging**:
   - Merging transfers dining visits, reservations, and tags from duplicate profiles into the primary record, followed by an immutable audit log.

---

## 3. Models Implemented (`backend/apps/customers/models.py`)
- **`Customer`**: Dining profile, contact coordinates, dietary/allergy preferences, tags, visit counts, and lifetime revenue.
- **`CustomerTag`**: Categorical segmentation tags (e.g., `VIP`, `Regular`, `Corporate`).
- **`CustomerVisit`**: Log of physical dining visits linking table, order ID, and guest count.
- **`Reservation`**: Dining reservations (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).

---

## 4. API Endpoints (`/api/v1/`)

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/customers/` | Search & list customer profiles | `customers.view` |
| `POST` | `/api/v1/customers/` | Create customer profile | `customers.manage` |
| `GET` | `/api/v1/customers/{id}/` | Retrieve customer profile details | `customers.view` |
| `PATCH` | `/api/v1/customers/{id}/` | Update customer profile | `customers.manage` |
| `DELETE` | `/api/v1/customers/{id}/` | Soft-deactivate customer profile | `customers.manage` |
| `POST` | `/api/v1/customers/{id}/merge/` | Merge duplicate customer into primary | `customers.manage` |
| `GET` | `/api/v1/customers/analytics/` | Retrieve CRM key metrics | `customers.view` |
| `GET` | `/api/v1/customers/tags/` | List customer tags | `customers.view` |
| `POST` | `/api/v1/customers/tags/` | Create customer tag | `customers.manage` |
| `GET` | `/api/v1/reservations/` | List reservations with date/status filter | `reservations.view` |
| `POST` | `/api/v1/reservations/` | Book table reservation | `reservations.manage` |
| `PATCH` | `/api/v1/reservations/{id}/` | Update reservation status (Check In / Cancel) | `reservations.manage` |

---

## 5. Frontend Feature (`src/features/customers/`)
```
frontend/src/features/customers/
├── api/
│   └── customers.api.ts             # Typed Axios client
├── components/
│   ├── CRMStatsCards.tsx            # KPIs (Total, Repeat Rate, Spend)
│   ├── CustomerListTable.tsx        # Customer table with dietary badges
│   ├── CreateCustomerModal.tsx      # RHF + Zod modal
│   ├── ReservationListTable.tsx     # Reservations table with check-in actions
│   └── CreateReservationModal.tsx   # Table booking modal
├── hooks/
│   ├── useCustomers.ts              # Customer query & mutations
│   └── useReservations.ts           # Reservation query & mutations
├── pages/
│   ├── CustomerDirectoryPage.tsx    # Customer CRM page
│   └── ReservationsPage.tsx         # Reservation calendar / list page
├── test/
│   ├── CustomerListTable.test.tsx
│   └── ReservationListTable.test.tsx
└── types/
    └── customers.types.ts           # TypeScript interfaces
```

---

## 6. Automation Integration

- `CUSTOMER_CREATED`, `RESERVATION_CREATED`, `RESERVATION_CANCELLED`, and `CUSTOMER_FEEDBACK_SUBMITTED` events drive customer-experience workflows (e.g. `CUSTOMER_FEEDBACK_FOLLOW_UP`).
- Conditions can reference `customer.*` entity fields (e.g. `customer.total_spend`).
- See [AUTOMATION.md](AUTOMATION.md) and [WORKFLOW_CONDITIONS.md](WORKFLOW_CONDITIONS.md).
