# Fluxiflow for Kitchen — Database Architecture & Conventions

---

## 1. Database Engine & Principles
- **Engine**: PostgreSQL 16+
- **Driver**: `psycopg` (v3 with async & connection pooling)
- **Primary Keys**: UUIDv4 (`UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`) across all entities.
- **Tenancy**: Row-Level Tenancy enforced via mandatory `tenant_id` foreign keys and `TenantScopedManager`.

---

## 2. Base Model Hierarchy

```
                    ┌─────────────────────────┐
                    │        UUIDModel        │ (id: UUIDv4 PK)
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    TimeStampedModel     │ (created_at, updated_at)
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   SoftDeletableModel    │ (is_deleted, deleted_at, soft_delete(), restore())
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    TenantAwareModel     │ (tenant_id: UUID, branch_id: UUID?)
                    └─────────────────────────┘
```

---

## 3. Database Indexing Strategy

1. **Tenant Composite Indexes**:
   - `(tenant_id, branch_id)` for high-frequency branch-scoped lookups.
   - `(tenant_id, is_deleted)` to optimize active record lookups while respecting soft deletion.
2. **Order & KOT Indexes**:
   - `(tenant_id, status)` for real-time KDS and Table view lookups.
   - `(order_id, created_at)` for historical ticket ordering.
3. **Audit Indexes**:
   - `(tenant_id, timestamp)` and `(entity_type, entity_id)` for compliance lookup velocity.

---

## 4. Transaction & Concurrency Policy

1. **Transactional Invariants (`with transaction.atomic():`)**:
   - **Order Lifecycle**: Firing KOT tickets, cancelling items, and transitioning table status must be atomic.
   - **Billing & Payments**: Calculation of taxes, discount approvals, and multi-tender settlements must be wrapped in transactions.
   - **Inventory Depletion**: Celery FIFO Bill-of-Materials deductions must use database transactions.
2. **Pessimistic Row Locking (`select_for_update()`)**:
   - When modifying active table sessions, splitting bills, or deducting limited ingredient stock, acquire row-level locks to prevent race conditions.

---

## 5. Migration Conventions
- Every model change must be accompanied by explicit Django migrations (`python manage.py makemigrations`).
- Production migrations must avoid destructive `ALTER TABLE ... DROP COLUMN` without prior deprecation cycles.
- Never manually edit applied migrations in production environments.
