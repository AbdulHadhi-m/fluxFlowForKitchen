# Authorization & RBAC Security — Fluxiflow for Kitchen

## 1. Authorization Model
Fluxiflow uses a granular, context-aware Role-Based Access Control (RBAC) engine that evaluates permissions at both the global API view level and object level.

```
[Request] ──► [IsAuthenticated] ──► [SecureTenantContextMiddleware] ──► [require_permission(code)] ──► [Object-Level Tenant Scope]
```

## 2. Dynamic Active-Role Scoping
Users who hold multiple roles within a restaurant organization (e.g. a Manager who also works Waitstaff shifts) switch their operational context explicitly:
1. `TenantMembership.assigned_roles` defines all permissible roles for the user.
2. `TenantMembership.active_role` determines the effective permission set evaluated on incoming requests.
3. Users cannot invoke capabilities belonging to secondary roles without executing a role-switch operation, preventing cross-domain operational errors.

## 3. Object-Level Authorization & Anti-IDOR
- **Tenant Scope Enforcement**: All domain entities inherit from `TenantAwareModel`.
- **QuerySet Scoping**: `TenantScopedManager` and `TenantSoftDeleteManager` automatically filter records by `tenant_id`.
- **`BaseTenantPermission` / `IsTenantMember`**: Validates that the requested object's `tenant_id` strictly matches the active tenant context of the authenticated user.
- **Header Anti-Spoofing**: `SecureTenantContextMiddleware` verifies that the user holds an active `TenantMembership` for the requested tenant before accepting any `X-Tenant-ID` header.
