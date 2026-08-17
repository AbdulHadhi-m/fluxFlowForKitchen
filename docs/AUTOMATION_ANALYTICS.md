# Automation Analytics

`GET /api/v1/automation/analytics/?days=30` (requires `automation.analytics.view`) returns a KPI overview computed from execution records. The analytics page (`/automation/analytics`) renders it with 7/30/90-day windows.

## Metrics
| Field | Meaning |
| --- | --- |
| `active_workflows` / `paused_workflows` | Count of workflows in each state |
| `executions_total` | Executions in the window |
| `executions_today` | Executions created today |
| `completed_today` / `failed_today` | Today's completed/failed runs |
| `successful` / `failed` / `waiting` / `cancelled` | Status counts in the window |
| `success_rate` / `failure_rate` | Percentage (1 decimal) |
| `avg_duration_seconds` | Average duration of completed runs (null when none) |
| `retry_count` | Total retries across failed steps |
| `pending_approvals` | Open approval requests (all time) |
| `scheduled_runs` | Schedule-triggered executions in window |
| `escalations` | Approvals with `escalation_count > 0` in window |
| `most_used_workflows` | Top 5 `{name, code, executions}` |
| `action_failures` | Top 5 `{step_code, failures}` hotspots |
| `daily` | Per-day `{day, total, completed, failed}` series |

## Observability Surfaces
- **Execution traces**: `GET /workflow-executions/<id>/` includes ordered `step_executions` with status, duration, retries, output, and error per step.
- **Event log**: `GET /workflow-events/?event_type=&entity_type=` shows the append-only domain event stream with `processed_at`.
- **Approvals**: inbox + statuses (PENDING/APPROVED/REJECTED/EXPIRED/CANCELLED) with `escalation_count` and `escalated_at`.
- **Tasks**: `GET /workflow-tasks/?status=&assignee=` tracks automation follow-ups.

## Operational Playbook
1. **Failure hotspots** — check `action_failures`; fix the step config or the underlying service, then retry affected executions.
2. **Approval bottlenecks** — high `pending_approvals`/`escalations` means gates need better role mapping or higher expiry.
3. **Success rate** — investigate `failed` vs `waiting`; WAIT-heavy rules inflate `waiting`.
4. **Loop protection** — executions hitting `max_steps` appear as FAILED with a step-count error; raise `max_steps` only when the design is sound.