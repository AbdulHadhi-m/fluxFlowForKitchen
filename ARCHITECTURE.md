# Fluxiflow for Kitchen — System Architecture Documentation

## 1. Architectural Philosophy
Fluxiflow is architected as an event-driven, multi-tenant **Modular Monolith** designed for high throughput, sub-150ms real-time screen synchronization, and absolute ACID consistency for financial and inventory domains.

## 2. Core Tenets
1. **Dynamic Active Role RBAC**: Permissions are evaluated strictly against the user's active role claim encoded in short-lived JWTs (`request.user.active_role`), permitting role switching without re-authentication.
2. **Row-Level Multi-Tenancy**: All operational entities inherit from `TenantAwareModel` with mandatory `tenant_id` scoping and automatic ORM query filtering.
3. **Price & Recipe Immutability**: Orders freeze item price, tax, and recipe snapshots at creation time, preserving historical accuracy.
4. **Channels + Redis Event Fabric**: Real-time KDS bumping, table occupancy state changes, and waiter notifications are broadcast across tenant-isolated WebSocket rooms.

> **Note**: Feature modules will be built iteratively across Prompts 5 through 15.
