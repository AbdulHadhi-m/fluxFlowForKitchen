# Automation & Workflow Engine

## Overview
The Automation module (Django app: `apps/workflows`) is Fluxiflow's business-rule engine. Restaurants can design, publish, and run automated workflows triggered by domain events (orders, payments, inventory, HR, marketing, procurement), schedules, webhooks, or manual runs.

The engine **orchestrates existing domain services** — it never mutates unrelated domain tables directly. Every runtime action is an allowlisted handler that calls an existing service (procurement, loyalty, notifications, finance, inventory, HR, marketing, customers).

## Key Concepts
- **Workflow**: a configurable automation definition (metadata: name, code, category, trigger type, scope, conditions, limits).
- **WorkflowVersion**: immutable published snapshot of a workflow's `definition` (`steps` + `conditions`). Executions always run against a frozen version, so publishing a new draft never changes in-flight runs.
- **WorkflowExecution**: a single runtime instance with status, input/output payloads, error details, and per-step traces.
- **WorkflowStepExecution**: per-step runtime trace (status, duration, retries, output, error).
- **WorkflowEventLog**: append-only domain event bus record with idempotency enforcement (`restaurant + event_id` unique).
- **WorkflowApprovalRequest**: human approval gate inside an execution.
- **WorkflowTask**: lightweight automation-owned follow-up task.

## Trigger Types
| Trigger | Config | Behavior |
| --- | --- | --- |
| `EVENT` | `{"event_types": ["ORDER_CREATED", ...]}` | Dispatched from domain services via `publish_event_via_bus` (transaction.on_commit) |
| `SCHEDULE` | `{"cron": "0 6 * * *"}` | Celery beat tasks evaluate due schedules |
| `MANUAL` | — | Explicit user run via API (`workflows.execute` permission) |
| `WEBHOOK` | webhook credential reference | Inbound/outbound webhook support |

## Workflow Lifecycle
`DRAFT` → `PUBLISH` (creates immutable version) → `ACTIVATE` → `PAUSED` (can `RESUME`) → `ARCHIVED`.
Only DRAFT workflows can be deleted. Publishing requires `workflows.publish`; state changes use the same permission.

## Supported Domain Events
`ORDER_CREATED`, `ORDER_COMPLETED`, `ORDER_CANCELLED`, `PAYMENT_COMPLETED`, `PAYMENT_FAILED`, `BILL_VOIDED`, `INVOICE_OVERDUE`, `INVENTORY_LOW`, `INVENTORY_OUT`, `PURCHASE_ORDER_CREATED`, `PURCHASE_ORDER_RECEIVED`, `CUSTOMER_CREATED`, `CUSTOMER_FEEDBACK_SUBMITTED`, `COMPLAINT_CREATED`, `TICKET_CREATED`, `TICKET_SLA_BREACHED`, `RESERVATION_CREATED`, `RESERVATION_CANCELLED`, `EMPLOYEE_ABSENCE_RECORDED`, `PAYROLL_COMPLETED`, `CAMPAIGN_COMPLETED`.

Emitting services: orders, billing, customers, inventory (tasks), procurement, HR, marketing — all publish via `transaction.on_commit`.

## Execution Statuses
`PENDING`, `RUNNING`, `WAITING`, `APPROVAL_REQUIRED`, `COMPLETED`, `FAILED`, `CANCELLED`, `PAUSED`.

## Frontend
- Route prefix `/automation` (dashboard, workflows list/builder/detail, executions, approvals, tasks, templates, analytics).
- Visual builder (`WorkflowBuilderPage`) supports step ordering, per-step config editors, condition trees, validate/publish/activate.
- All screens use TanStack Query hooks in `frontend/src/features/automation/hooks/useAutomation.ts`.

## Reference Docs
- [WORKFLOW_ENGINE.md](WORKFLOW_ENGINE.md) — runtime engine internals
- [BUSINESS_RULES.md](BUSINESS_RULES.md) — conditions & branching
- [WORKFLOW_ACTIONS.md](WORKFLOW_ACTIONS.md) — action registry
- [WORKFLOW_CONDITIONS.md](WORKFLOW_CONDITIONS.md) — condition syntax & operators
- [APPROVAL_WORKFLOWS.md](APPROVAL_WORKFLOWS.md) — human approval gates
- [AUTOMATION_SECURITY.md](AUTOMATION_SECURITY.md) — permissions & secrets
- [AUTOMATION_ANALYTICS.md](AUTOMATION_ANALYTICS.md) — KPIs & observability

## Observability Integration
- Every workflow execution records a `CeleryTaskRun` (runner execution) with correlation IDs propagated from the triggering HTTP request — traceable end-to-end.
- `handle_webhook` actions record `WebhookDelivery` metrics; `SEND_EMAIL` records delivery metrics (see [RELIABILITY.md](RELIABILITY.md)).
- Failures surface in Error Tracking (`/monitoring/errors`) with module `workflows` and can trigger alert rules keyed on `celery_failure_rate` or webhook failure rates (see [ALERTING.md](ALERTING.md)).
