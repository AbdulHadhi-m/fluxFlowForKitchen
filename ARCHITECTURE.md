# Fluxiflow for Kitchen — System Architecture Documentation

## 1. Architectural Philosophy
Fluxiflow is architected as an event-driven, multi-tenant **Modular Monolith** designed for high throughput, sub-150ms real-time screen synchronization, and absolute ACID consistency for financial and inventory domains.

## 2. Core Tenets
1. **Dynamic Active Role RBAC**: Permissions are evaluated strictly against the user's active role claim encoded in short-lived JWTs (`request.user.active_role`), permitting role switching without re-authentication.
2. **Row-Level Multi-Tenancy**: All operational entities inherit from `TenantAwareModel` with mandatory `tenant_id` scoping and automatic ORM query filtering.
3. **Price & Recipe Immutability**: Orders freeze item price, tax, and recipe snapshots at creation time, preserving historical accuracy.
4. **Channels + Redis Event Fabric**: Real-time KDS bumping, table occupancy state changes, and waiter notifications are broadcast across tenant-isolated WebSocket rooms.
5. **Configurable Workflow Engine**: Domain services publish events via `transaction.on_commit`; the workflow engine (`apps/workflows`) orchestrates allowlisted actions against existing domain services, with immutable published versions, idempotency keys, approval gates, and per-tenant isolation.
6. **Production Observability**: A dedicated monitoring module (`apps/monitoring`) provides request metrics, latency percentiles, slow-query capture, Celery task tracking, error fingerprinting, alert rules, incident lifecycle (MTTA/MTTR), SLOs, and dependency health probes — with secret-redacting structured logging and non-blocking instrumentation.

> **Note**: Feature modules are built iteratively. See [docs/AUTOMATION.md](docs/AUTOMATION.md) for the automation subsystem and [docs](docs/) for all feature documentation. For observability, start with [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) and [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md).
