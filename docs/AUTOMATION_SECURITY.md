# Automation Security

## Permission Model
Workflow management is governed by RBAC permission codes (seeded by `seed_rbac`; granted to the MANAGER role by default, RESTAURANT_ADMIN inherits everything):

| Permission | Scope |
| --- | --- |
| `workflows.view` | List/read workflows, executions, approvals, tasks, event log |
| `workflows.create` | Create draft workflows |
| `workflows.edit` | Update workflows, instantiate templates |
| `workflows.publish` | Publish versions + change state (activate/pause/archive/resume) |
| `workflows.execute` | Run workflows manually |
| `workflows.cancel` | Cancel/retry/pause/resume executions |
| `workflows.approve` | Respond to approval requests |
| `automation.analytics.view` | Read automation analytics |

API enforcement: every view uses `require_permission(...)`; the approval inbox additionally filters by the caller's tenant roles.

## Tenant Isolation
- RESTAURANT-scoped workflows are visible only to their tenant; GLOBAL platform workflows are visible to all tenants.
- Executions, approval requests, tasks, and event logs are always filtered by `restaurant`.
- The approval inbox resolves roles from the caller's `TenantMembership` (active_role + assigned_roles) — a user with no membership only sees direct/system-wide requests.

## Action Allowlist
- Only registered action codes can be referenced; unknown codes fail at publish time (`ACTION_NOT_FOUND`).
- Each action carries the minimum permission required to run (e.g. `procurement.create`, `loyalty.adjust`, `marketing.create`) — checked at execution time.
- No arbitrary code, no dynamic imports, no shell commands.

## Secrets & Webhooks
- Webhook secrets are **never stored in the database**. `WorkflowWebhookCredential` stores only a `reference_key` into `settings.FLUXIFLOW_WEBHOOK_CREDENTIALS` (environment-backed, default `{}`).
- Credential endpoints may not contain credentials in the URL.
- Step outputs and event logs never include secrets; webhook results record only status and endpoint.
- `auth_type` supports NONE / BEARER / BASIC / HMAC resolved from settings by key at execution time.

## Execution Safety
- Loop protection: `max_steps` (default 50) and `max_nested_depth` (default 3) bound runaway workflows.
- Timeout: `timeout_minutes` (default 120) fails long-running executions.
- Idempotency: unique `(restaurant, event_id)` on the event log prevents duplicate runs from replayed events.
- Actions orchestrate existing services with their own deduplication (e.g. loyalty per-order idempotency).

## Auditability
- `WorkflowVersion.published_by` / `published_at`, `Workflow.created_by` / `updated_by` are recorded.
- Executions record `triggered_by` for manual runs and the originating `event_id` otherwise.
- Step traces record every action output and error; the audit log records workflow entity changes (entity type `WORKFLOW*`).