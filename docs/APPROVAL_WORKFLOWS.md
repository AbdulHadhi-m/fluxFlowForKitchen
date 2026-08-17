# Approval Workflows

Human-in-the-loop gates are first-class workflow steps: an APPROVAL step pauses the execution in `APPROVAL_REQUIRED` until an authorized user approves or rejects it.

## Approval Step Config
| Field | Description |
| --- | --- |
| `approver_role` | RBAC role code required to approve (e.g. `MANAGER`, `RESTAURANT_ADMIN`) |
| `approver_id` | Optional direct assignee |
| `reason` | Human-readable justification shown in the inbox |
| `amount` | Monetary amount surfaced to the approver (supports `{{payload.*}}` references) |
| `expiry_hours` | Hours until the request expires (auto-rejected by the escalator task) |

## Runtime Behavior
1. The engine creates a `WorkflowApprovalRequest` bound to the execution; execution status becomes `APPROVAL_REQUIRED`.
2. The request is visible in the **Approval Inbox** (`/automation/approvals`) for:
   - the direct assignee,
   - any user holding the configured role (via `TenantMembership` active/assigned roles, plus `RESTAURANT_ADMIN`),
   - requests without an assignee or role (system-wide).
3. **Approve** → the execution resumes automatically at the next step (via `resume_after_approval`, eager in tests).
4. **Reject** → the execution fails with the rejection reason in the error trace.
5. **Expiry** → the scheduled task marks the request `EXPIRED`; repeated breaches increment `escalation_count` and re-request escalation.

## Inbox API
- `GET /api/v1/workflow-approvals/?status=PENDING` — inbox for the current user (role-aware filtering).
- `POST /api/v1/workflow-approvals/<id>/approve/` with `{"note": "..."}`.
- `POST /api/v1/workflow-approvals/<id>/reject/` with `{"note": "..."}`.
- Requires `workflows.approve` to respond; `workflows.view` to list.

## Template Examples
- `LARGE_REFUND_APPROVAL` — MANAGER approval when `payload.refund_amount > 500`, 24h expiry.
- `LARGE_PURCHASE_APPROVAL` — RESTAURANT_ADMIN approval when `payload.total_amount > 5000`, 48h expiry.
- `LARGE_DISCOUNT_APPROVAL` — MANAGER approval when `payload.discount_amount > 200`.

## Separation of Duties
The engine records `requested_by`, `responded_by`, and `responded_at` on every request. The test suite enforces that the requester cannot respond to their own request when SoD policy requires a distinct approver.