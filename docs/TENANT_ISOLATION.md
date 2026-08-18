# Tenant Isolation & Multi-Tenancy Architecture — Fluxiflow for Kitchen

## 1. Multi-Tenant Model: Logical Pool Architecture
Fluxiflow uses a shared-database, shared-schema logical isolation model. Tenant data is isolated through architectural invariants enforced at the database, query manager, application view, and real-time websocket layers.

## 2. Invariant 1: Mandatory Model Partitioning
Every tenant-scoped entity in the system inherits from `TenantAwareModel`:
```python
class TenantAwareModel(UUIDModel, TimeStampedModel, SoftDeletableModel):
    tenant_id = models.UUIDField(db_index=True)
    branch_id = models.UUIDField(null=True, blank=True, db_index=True)
    objects = TenantSoftDeleteManager()
```
Database composite indexes (`tenant_id, is_deleted` and `tenant_id, branch_id`) guarantee partition performance and query isolation.

## 3. Invariant 2: Tenant Query Managers
The default manager `TenantSoftDeleteManager` automatically excludes soft-deleted records and provides `.for_tenant(tenant_id)` query helpers, preventing unintentional global data leakage across tenants.

## 4. Invariant 3: Request Context Validation
`SecureTenantContextMiddleware` prevents client header tampering:
- For authenticated requests, `request.tenant_id` is only set if the user has an active, verified `TenantMembership` in that specific restaurant organization.
- If a client attempts to pass a spoofed `X-Tenant-ID` header for a tenant they do not belong to, the middleware automatically nullifies the context and rejects the request.

## 5. Invariant 4: WebSocket Channel Isolation
Real-time events (KDS ticket updates, POS order updates, billing notifications) are dispatched strictly to tenant-scoped channel groups:
- KDS tickets: `restaurant_{restaurant_id}_kds`
- POS updates: `restaurant_{restaurant_id}_orders`
- Staff notifications: `user_{user_id}`
Clients connecting to WebSocket channels are authenticated using JWT token validation on the handshake, and channel authorization verifies tenant membership before joining any group.
