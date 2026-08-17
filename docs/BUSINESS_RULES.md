# Business Rules

## What Are Business Rules?
Business rules in Fluxiflow are declarative, versioned workflow definitions that encode operational policy:

- "Alert the shift manager whenever an employee records an absence."
- "Request manager approval for refunds above $500."
- "Notify procurement when a low-stock item passes its par level."
- "Award bonus loyalty points when a completed order exceeds $100."

## Where Rules Live
Rules are stored as `Workflow` rows (`apps/workflows/models.py`) with:
- `conditions` — workflow-level preconditions evaluated before the first step runs.
- `steps` — ordered chain of ACTION / CONDITION / APPROVAL / WAIT / BRANCH / END nodes.
- `trigger_type` + `trigger_config` — when the rule fires.

## Rule Authoring
Two paths:

1. **Visual builder** — `/automation/workflows/new` (or edit an existing draft). Configure trigger, preconditions, and steps; Validate; Publish; Activate.
2. **Templates** — `/automation/templates` instantiates 10 built-in blueprints (see below).

## Built-in Templates
| Code | Trigger | Behavior |
| --- | --- | --- |
| `LOW_STOCK_REORDER` | `INVENTORY_LOW` | Create a purchase requisition for the low-stock item at par level |
| `PAYMENT_FAILED_ALERT` | `PAYMENT_FAILED` | Notify cashier team + create recovery task |
| `SUPPORT_SLA_ESCALATION` | `TICKET_SLA_BREACHED` | Escalate + alert staff |
| `CUSTOMER_FEEDBACK_FOLLOW_UP` | `CUSTOMER_FEEDBACK_SUBMITTED` | Wait 1 day, then create follow-up task |
| `LARGE_REFUND_APPROVAL` | `PAYMENT_FAILED` | Approval gate when refund > threshold |
| `LARGE_PURCHASE_APPROVAL` | `PURCHASE_ORDER_CREATED` | Approval gate for purchase orders > threshold |
| `EMPLOYEE_ABSENCE_ALERT` | `EMPLOYEE_ABSENCE_RECORDED` | Notify shift managers + create coverage task |
| `LARGE_DISCOUNT_APPROVAL` | `ORDER_CREATED` | Approval gate for discounts > threshold |
| `LOYALTY_POINTS_BONUS` | `ORDER_COMPLETED` | Award bonus points above spend threshold |

## Versioning Semantics
- Publishing creates a new immutable `WorkflowVersion`; the workflow's `active_version` pointer moves to it.
- In-flight executions keep running against the version they started on.
- `version_count`, `active_version_number`, and `published_by_name` are exposed in the API.

## Best Practices
- Use `{{payload.field}}` references instead of hardcoded values so rules adapt to real events.
- Keep approval gates narrow: role + amount threshold + expiry.
- Test with Validate before publishing; monitor `AUTOMATION_ANALYTICS` for failure hotspots.
- Only DRAFT workflows can be deleted; archive retired rules for auditability.