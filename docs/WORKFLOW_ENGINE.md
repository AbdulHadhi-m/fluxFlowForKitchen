# Workflow Engine Internals

## Architecture
```
Domain service ──(transaction.on_commit)──▶ publish_event_via_bus()
                                                   │
                                                   ▼
                                          WorkflowEventLog (idempotent)
                                                   │
                                     _dispatch_to_workflows (event-type match)
                                                   │
                                                   ▼
                                   WorkflowExecutionService.execute()
                                                   │
                                                   ▼
                              engine/runner.py ──▶ ExecutionContext (template resolution)
                              engine/locks.py ──▶ distributed lock (Redis, DB fallback)
                              conditions/engine.py ──▶ condition evaluation
                              actions/registry.py ──▶ allowlisted action handlers
```

## Idempotency
- `WorkflowEventLog` enforces a unique `(restaurant, event_id)` — replaying the same domain event does not create duplicate executions.
- Executions store the originating `event_id` as their idempotency key.
- Action handlers (e.g. loyalty points) apply their own per-order deduplication.

## Event Dispatch
`events.py` defines `EventType` and `ALL_EVENT_TYPES`. `_dispatch_to_workflows`:
1. Records the event log row (unique constraint guards replays).
2. Filters ACTIVE workflows whose `trigger_config.event_types` includes the event type (Python-side filtering — SQLite cannot use JSON `contains` lookups).
3. For each matching workflow, evaluates workflow-level `conditions` preconditions; if false, skips.
4. Creates an execution under the workflow's published version (falls back to a draft definition only for explicit manual runs) and runs the engine.

## Step Execution Model
Steps execute in declaration order unless overridden by:
- `next` — explicit next step code.
- `on_true` / `on_false` — branch targets for CONDITION/BRANCH steps.
- `END` — terminates the run.

Loop protection: `max_steps` per run (default 50) and `max_nested_depth` (default 3) bound runaway definitions.

## WAIT Steps
`WAIT` steps (`duration_seconds`) mark the step execution `WAITING` and set `resume_at` on the execution. The scheduled task resumes the execution after the delay, advancing past an already-WAITING step execution rather than re-scheduling it. `resume_at` is exposed in the API for observability.

## Retries & Timeouts
- Per-step retries honor the workflow `max_retries` and the action's `RetryPolicy` (default: 3 attempts, 30s delay, 2x backoff).
- A total `timeout_minutes` (default 120) fails executions that exceed the wall-clock limit.

## Locking
`engine/locks.py` acquires a Redis lock keyed by workflow code (falls back to a database advisory-style lock when Redis is unavailable — a warning is logged in test environments).

## Celery Tasks (`apps/workflows/tasks.py`)
Five scheduled jobs registered in `CELERY_BEAT_SCHEDULE`:
1. `resume_due_workflows` — resume executions whose `resume_at` has elapsed (WAIT steps).
2. `process_scheduled_workflows` — evaluate SCHEDULE-triggered workflows (cron match).
3. `escalate_stale_approvals` — expire approvals past `expires_at`, escalate repeatedly.
4. `detect_overdue_invoices` — publish `INVOICE_OVERDUE` for OPEN/PARTIALLY_PAID/OVERDUE receivables using `balance_due`.
5. `detect_low_stock` — publish `INVENTORY_LOW` / `INVENTORY_OUT`.

## Manual Execution
`WorkflowExecutionService.execute_manually(workflow, user, input)` runs the workflow immediately with the provided input payload; `triggered_by` is recorded for audit.

## Cancellation / Pause / Retry
- `cancel(execution, user)` — cancels a run and any pending child executions.
- `pause_execution` / `resume_execution` — temporarily suspend and resume.
- `retry(execution, user)` — re-runs a FAILED/CANCELLED execution from its last step.