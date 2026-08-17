# Fluxiflow for Kitchen — Staff Management & Employee Accounts

---

## 1. Domain Overview
Staff Management establishes the operational employment context within a restaurant tenant. It clearly decouples authentication identity from restaurant operational membership and role authorization:

- **`User` (`apps.accounts.models.User`)**: Global authentication identity (email, password hash, failed login lockout).
- **`StaffProfile` (`apps.staff.models.StaffProfile`)**: Employment profile within a single restaurant tenant (Employee ID, contact info, status).
- **`TenantMembership` (`apps.rbac.models.TenantMembership`)**: Operational RBAC binding tracking `assigned_roles` and `active_role`.

---

## 2. Core Business Invariants & PRD Rules
1. **Single Restaurant Association**: Every staff member belongs to exactly one restaurant organization.
2. **Primary Role**: Exactly **ONE Primary Role** per employee (e.g. `WAITER`, `CASHIER`, `MANAGER`, `KITCHEN_STAFF`). Governs default landing dashboard and initial session active role upon login.
3. **Secondary Roles**: **Zero or more Secondary Roles** available for dynamic in-session role switching without logging out.
4. **Primary / Secondary Exclusion**: The Primary Role cannot be duplicated inside Secondary Roles.
5. **Active Role Invariant**: `active_role ∈ [primary_role] + secondary_roles`. If a role is removed, the active role automatically defaults back to `primary_role`.
6. **Platform Exclusivity**: `SAAS_OWNER` is a platform-level role and can **NEVER** be assigned to restaurant staff.
7. **Session Invalidation on Deactivation**: When a staff account is set to `DISABLED`, all active user sessions (`UserSession`) are immediately revoked, preventing unauthorized token renewal or privileged API access.

---

## 3. Data Models (`backend/apps/staff/models.py`)

### `StaffProfile`
- **Primary Identifier**: UUIDv4 (`id`)
- **Employee Identifier**: `employee_id` (e.g. `EMP-001`), unique per restaurant tenant via `UniqueConstraint(fields=["restaurant", "employee_id"])`.
- **Identity Links**: `user` (FK to User), `restaurant` (FK to Restaurant), `membership` (1:1 to TenantMembership).
- **Role References**: `primary_role` (FK to Role, `on_delete=models.PROTECT`), `secondary_roles` (M2M with Role).
- **Status**: `status` (`ACTIVE`, `DISABLED`), `is_active` boolean.

---

## 4. API Endpoints (`/api/v1/staff/`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/staff/` | List current restaurant staff with search, status filter, and pagination | `staff.view` |
| `POST` | `/api/v1/staff/` | Provision staff account with primary & secondary roles | `staff.create` |
| `GET` | `/api/v1/staff/{id}/` | Get detailed staff employee profile | `staff.view` |
| `PATCH`| `/api/v1/staff/{id}/` | Update employee profile, change primary/secondary roles, or status | `staff.update` |
| `POST` | `/api/v1/staff/{id}/disable/` | Disable staff account & terminate active user sessions | `staff.remove` / `staff.disable` |
| `POST` | `/api/v1/staff/{id}/reactivate/` | Reactivate disabled staff member | `staff.update` |

---

## 5. Frontend Architecture (`src/features/staff/`)
```
frontend/src/features/staff/
├── api/
│   └── staff.api.ts              # Typed Axios API methods
├── components/
│   ├── StaffCreateModal.tsx      # Creation modal with Primary & Secondary roles selector
│   ├── StaffDisableDialog.tsx    # Confirmation dialog warning of session termination
│   ├── StaffEditModal.tsx        # Profile & role modification modal
│   └── StaffListTable.tsx        # Employee roster table with role badges & action buttons
├── hooks/
│   └── useStaff.ts               # TanStack Query query and mutation hooks
├── pages/
│   └── StaffManagementPage.tsx   # Responsive staff management dashboard with filters & search
├── schemas/
│   └── staff.schemas.ts          # Zod validation schemas
├── test/
│   ├── StaffCreateModal.test.tsx
│   └── StaffListTable.test.tsx
└── types/
    └── staff.types.ts            # TypeScript interfaces
```

---

## 6. Security & Tenant Isolation
- **Tenant Scope Resolution**: Staff list and individual member operations resolve strictly from `request.user`'s current active restaurant.
- **Foreign UUID Rejection**: Supplying an employee UUID from another restaurant results in `404 Not Found`.
- **RBAC Gating**: `Restaurant Admin` and authorized `Manager` (`staff.view`, `staff.create`, `staff.update`, `staff.remove`) have staff administration privileges; operational roles (`Waiter`, `Kitchen Staff`, `Cashier`) receive `403 Forbidden`.

---

## 7. Automation Integration

- `EMPLOYEE_ABSENCE_RECORDED` (from leave requests) and `PAYROLL_COMPLETED` (from payroll runs) events drive HR workflows such as `EMPLOYEE_ABSENCE_ALERT` (notify shift managers + create coverage task).
- See [AUTOMATION.md](AUTOMATION.md) and [BUSINESS_RULES.md](BUSINESS_RULES.md).
