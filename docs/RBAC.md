# Fluxiflow for Kitchen — RBAC & Authorization Architecture

---

## 1. Authentication vs Authorization
- **Authentication ("Who are you?")**: Verified via normalized email credentials, JWT tokens (15m access / 7d HttpOnly refresh), and `UserSession` tracking (implemented in Prompt 6).
- **Authorization ("What are you allowed to do?")**: Enforced via **Role-Based Access Control (RBAC)** scoped to a tenant organization and the user's **currently selected active role** (implemented in Prompt 7).

---

## 2. RBAC Model Hierarchy

```
User
  │ (1 : N)
  ▼
TenantMembership (Unique: user + tenant_id)
  ├── active_role ────────► Role (Single active role determining effective permissions)
  └── assigned_roles ─────► Role[] (Multiple roles user is qualified to assume)
                             │ (M : N)
                             ▼
                           Permission (`resource.action`)
```

---

## 3. Permission Naming Standard
Permissions follow the canonical format: `<resource>.<action>`

### System Permissions Catalog:
- **Orders**: `orders.view`, `orders.create`, `orders.update`, `orders.cancel`, `orders.transfer`
- **Kitchen (KDS)**: `kitchen.view`, `kitchen.bump`, `kitchen.recall`
- **Menu**: `menu.view`, `menu.create`, `menu.update`, `menu.delete`
- **Tables**: `tables.view`, `tables.create`, `tables.update`, `tables.delete`
- **Billing**: `billing.view`, `billing.create`, `billing.split`, `billing.discount`, `billing.refund`
- **Inventory**: `inventory.view`, `inventory.update`, `inventory.manage`
- **Staff**: `staff.view`, `staff.invite`, `staff.update`, `staff.remove`
- **Reports**: `reports.view`, `reports.export`
- **Settings**: `settings.view`, `settings.update`
- **Audit**: `audit.view`

---

## 4. System Roles & Baseline Permissions

| Role Code | Title | Description | Granted Scope |
| :--- | :--- | :--- | :--- |
| `SAAS_OWNER` | SaaS Platform Owner | Unrestricted platform superuser | `*` (All permissions) |
| `RESTAURANT_ADMIN` | Restaurant Admin | Full administrative restaurant control | `*` (All permissions within tenant) |
| `MANAGER` | Store Manager | Shift management, floor, inventory, refunds | Operations, orders, kitchen, billing, inventory, reports |
| `CASHIER` | Cashier / POS | Checkout, bill generation & settlement | Orders, tables, billing, menu |
| `WAITER` | Server / Waitstaff | Dining room table orders & status | Orders, tables, menu, kitchen view |
| `KITCHEN_STAFF` | Chef / Cook | Food preparation & KDS ticket bumping | Kitchen view/bump, orders view, inventory |

---

## 5. Dynamic Active Role Switching

- **Backend Endpoint**: `POST /api/v1/auth/switch-role/`
  - Body: `{ "role_code": "MANAGER", "tenant_id": "<uuid>" }`
  - Validates that the requested role exists within the user's `assigned_roles` for that tenant.
  - Updates `TenantMembership.active_role` atomically.
  - Returns updated authorization context with recalculated effective permissions.
- **Frontend Hook**: `useActiveRole()` and `RoleSwitcher` dropdown component.
- **UI Guard**: `<Can permission="orders.create">...</Can>`
- **Route Guard**: `<PermissionRoute requiredPermission="orders.view">...</PermissionRoute>`

---

## 6. Seed Command (Idempotent)

```bash
# Seed all permissions and system roles
python manage.py seed_rbac
```
