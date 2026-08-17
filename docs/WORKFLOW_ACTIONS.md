# Workflow Actions Reference

Actions are **allowlisted** handlers registered in `apps/workflows/actions/registry.py`. A workflow can only reference registered action codes; arbitrary code execution is impossible. Each action declares an input schema, a required permission, and a retry policy.

Handlers receive `(step_config, ExecutionContext)` and MUST orchestrate existing domain services. Outputs are safe metadata dicts (never secrets), recorded in the step execution trace.

## Action Registry

| Code | Name | Required Permission | Behavior |
| --- | --- | --- | --- |
| `SEND_NOTIFICATION` | Send In-App Notification | `notifications.manage` | Notify a specific user (`recipient_id`) or all staff with `permission_code`; fields: title, message, severity (INFO/SUCCESS/WARNING/CRITICAL) |
| `SEND_EMAIL` | Send Email | — | Send via configured Django email backend; fields: `to`, `subject`, `body` |
| `CREATE_TASK` | Create Task | `workflows.execute` | Create an internal automation follow-up task; fields: title, description, priority, assignee_role |
| `ASSIGN_TASK` | Assign Task | `workflows.execute` | Assign/reassign an existing automation task (`task_id`, `assignee_id`) |
| `CREATE_FOLLOW_UP` | Create Follow-up | `workflows.execute` | Schedule a follow-up task relative to the current event |
| `CREATE_SUPPORT_TICKET` | Create Support Ticket | `workflows.execute` | Open automated support ticket + alert staff |
| `REQUEST_APPROVAL` | Request Approval | `workflows.approve` | Create a human approval gate (role or direct assignee, amount, reason, expiry) |
| `CREATE_PURCHASE_REQUEST` | Create Purchase Requisition | `procurement.requisition.create` | Create requisition via procurement service |
| `CREATE_DRAFT_PURCHASE_ORDER` | Create Draft Purchase Order | `procurement.create` | Create draft PO via procurement service |
| `ADD_LOYALTY_POINTS` | Add Loyalty Points | `loyalty.adjust` | Award loyalty points (idempotent per order) |
| `CREATE_COUPON` | Create Coupon | `marketing.create` | Generate coupon code for an existing promotion |
| `ESCALATE` | Escalate | `workflows.execute` | Escalate to staff with a permission + create urgent task |
| `WEBHOOK` | Outbound Webhook | `workflows.execute` | POST safe payload to an approved endpoint (credential reference only) |

## Orchestration Principle
Each handler delegates to the owning domain service:
- Procurement: `RequisitionService` / `PurchaseOrderService`.
- Loyalty: loyalty transaction service (per-order idempotency).
- Notifications: `NotificationService` (create / notify users with permission, deduplicated).
- Marketing: coupon generation via `Coupon.generate_secure_code`.
- Tasks: `WorkflowTask` records (never third-party domain tables).

## Input Templates
Configs support template references resolved by `ExecutionContext.resolve_references`:
- `{{payload.field}}` — event payload value.
- `{{event.field}}` — event envelope field.
- `{{input.field}}` — manual-run input value.
- Unresolved references are kept verbatim (so the handler can log/validate them).

Example ACTION step:
```json
{
  "code": "notify",
  "name": "Notify Cashier",
  "type": "ACTION",
  "config": {
    "action": "SEND_NOTIFICATION",
    "permission_code": "billing.view",
    "title": "Payment Failed",
    "message": "A payment attempt failed for order {{payload.order_number}}."
  }
}
```

## Failure Semantics
- A handler raising `ActionError` records `{error_code, message}` in the step trace and triggers the retry policy.
- Unknown action codes fail validation at publish time with `ACTION_NOT_FOUND`.
- Secrets are never included in step outputs; webhook responses log only status + endpoint.