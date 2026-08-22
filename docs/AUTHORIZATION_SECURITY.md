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

## 4. SaaS Owner & Platform Admin Restrictions (Segregation of Duties)
Platform administrators and SaaS Owners are strictly decoupled from operational restaurant workflows:
1. **No Restaurant Operations**: Cannot bump kitchen tickets, seat guests, or manage shift rosters.
2. **No Customer Orders**: Cannot create or modify POS, dining, or online customer orders.
3. **No Payment Processing**: Cannot process credit cards, open/close cash drawers, or issue payment refunds.
4. **Read-Only Impersonation by Default**: Support impersonation is read-only. Operational mutation during impersonation requires an explicit, audited elevated break-glass grant.

See [SAAS_OWNER_RESTRICTIONS.md](SAAS_OWNER_RESTRICTIONS.md) for full compliance specifications.
