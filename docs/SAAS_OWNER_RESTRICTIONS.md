# SaaS Owner Restrictions & Segregation of Duties — Fluxiflow for Kitchen

---

## 1. Executive Summary & Purpose
In multi-tenant SaaS architecture for restaurant management, platform-level administrators (**SaaS Owner / Platform Superadmin**) maintain system infrastructure, tenant lifecycle provisioning, security policies, global billing subscriptions, and production observability.

However, to guarantee **tenant data sovereignty, regulatory compliance (SOC 2, PCI-DSS), financial integrity, and fraud prevention**, strict architectural boundaries and **Segregation of Duties (SoD)** are enforced against the SaaS Owner role.

---

## 2. Core Restrictions Matrix

| Restriction Domain | Rule / Constraint | Rationale / Compliance |
| :--- | :--- | :--- |
| **1. Restaurant Operations** | **Cannot participate in day-to-day restaurant floor & kitchen operations** | Prevents interference in live dining room workflows, ticket bumping, inventory counts, or employee scheduling. |
| **2. Customer Orders** | **Cannot create or alter customer orders** | Enforces that customer orders originate strictly from verified in-restaurant staff (Waiters/Cashiers) or validated digital customer channels. |
| **3. Payments & Billing** | **Cannot process payments, settle checks, or issue refunds** | Prevents unauthorized financial transactions, unauthorized cash-drawer balancing, and unauthorized merchant payment gateway charges. |
| **4. Impersonation & Support** | **Cannot modify restaurant operational data while impersonating unless explicitly allowed** | Default impersonation is **Read-Only / Diagnostics**. Operational writes require an audited, time-bounded break-glass grant. |

---

## 3. Detailed Restriction Specifications

### ● 1. Cannot Participate in Restaurant Operations
- **Kitchen Display System (KDS)**: SaaS Owners cannot bump tickets, recall orders, or change kitchen production states (`kitchen.bump`, `kitchen.recall`, `kitchen.status.manage`).
- **Table & Floor Management**: SaaS Owners cannot alter table occupancy, seat parties, or change live dining statuses (`tables.status.manage`).
- **Staff Rostering & HR**: SaaS Owners cannot clock in/out on behalf of staff, approve shift swaps, or execute tenant payroll runs (`hr.attendance.clock`, `hr.shifts.manage`, `hr.payroll.manage`).
- **Staff Profile Invariant**: `SAAS_OWNER` is a platform-level role and can **never** be assigned as a restaurant `StaffProfile.primary_role` or `secondary_roles`.

### ● 2. Cannot Create Customer Orders
- SaaS Owners are denied operational order mutation permissions:
  - `orders.create` (Create dine-in, takeaway, or drive-thru orders)
  - `orders.update` (Modify order items, modifiers, or course timing)
  - `orders.cancel` (Void or cancel active kitchen orders)
  - `orders.transfer` (Transfer orders between dining tables)
- In the backend API views, order creation requires `orders.create` within an active tenant membership tied to authorized staff roles (`WAITER`, `CASHIER`, `MANAGER`, `RESTAURANT_ADMIN`).

### ● 3. Cannot Process Payments
- SaaS Owners are strictly barred from point-of-sale financial operations:
  - `billing.create` / `billing.payment.create` (Process customer credit card, digital wallet, or cash payments)
  - `billing.split` (Split check transactions)
  - `billing.discount` (Apply customer discounts or manager overrides)
  - `billing.refund` (Issue payment refunds or invoice credit notes)
  - `finance.cash.manage` (Open, count, payout, or close physical cash drawer sessions)
- All financial settlement requests must be executed by authenticated cashier/manager accounts with active POS shifts.

### ● 4. Cannot Modify Restaurant Operational Data While Impersonating Unless Explicitly Allowed
- **Read-Only Diagnostics Mode by Default**: When a SaaS Owner or support technician impersonates a tenant organization to troubleshoot issues:
  - Read access is enabled for diagnostic visibility (`orders.view`, `menu.view`, `tables.view`, `billing.view`, `inventory.view`, `audit.view`, `logs.view`).
  - All write/mutation endpoints return `403 Forbidden` (`IMPERSONATION_READ_ONLY_MODE`).
- **Explicit Break-Glass Elevation**: Modifying tenant operational data (e.g. restoring corrupted menu mappings, emergency category recovery) requires:
  1. An explicit **Break-Glass Impersonation Elevation Request**.
  2. Mandatory recorded justification / ticket ID (e.g. `TICKET-8492: Fix corrupted modifier link`).
  3. Time-bounded expiry (max 1 hour per session).
  4. Immutable security audit logging (`SecurityEvent` & `AuditLog`) with operator identity, target tenant, client IP, and full request payload diff.

---

## 4. Technical Enforcement Summary

```
                       ┌───────────────────────────────────────┐
                       │          SaaS Owner Request           │
                       └──────────────────┬────────────────────┘
                                          │
                                          ▼
                       ┌───────────────────────────────────────┐
                       │       RBAC Permission Evaluation      │
                       │  - settings.*, security.*, audit.*    │
                       │  - *.view (Read-Only Support)         │
                       └──────────────────┬────────────────────┘
                                          │
                         Is Operational Mutation Request?
                         (orders.create, billing.pay, etc.)
                                    /           \
                                  YES            NO
                                  /                \
                                 ▼                  ▼
     ┌────────────────────────────────────┐    ┌───────────────────────────┐
     │  Is Explicit Break-Glass Impersonation│    │ Proceed to Controller     │
     │  Write Mode Authorized & Active?   │    └───────────────────────────┘
     └──────────────────┬─────────────────┘
                        │
                  /           \
                YES            NO
                /                \
               ▼                  ▼
┌──────────────────────────┐   ┌───────────────────────────┐
│ Log Break-Glass Audit    │   │ 403 FORBIDDEN:            │
│ & Allow Operation        │   │ SaaS Owner restricted from│
└──────────────────────────┘   │ restaurant operations     │
                               └───────────────────────────┘
```

---

## 5. Summary of RBAC Granted vs Restricted Scopes

| Scope Category | Granted to `SAAS_OWNER` | Restricted from `SAAS_OWNER` |
| :--- | :--- | :--- |
| **Platform Management** | Global settings, security policies, incident management, session revoking, monitoring dashboards, system reports | N/A |
| **Tenant Diagnostics** | View orders, view menu, view tables, view billing receipts, view audit trail, view logs | Direct POS order entry, live ticket bumping, table seating |
| **Financial / POS Operations** | View aggregate analytics, export tax/audit reports | Process customer cards, refund payments, cash drawer floats, split checks |
| **Tenant Modification** | Tenant provisioning, plan subscription adjustments | Operational data edits during support sessions (unless elevated break-glass grant) |

---
