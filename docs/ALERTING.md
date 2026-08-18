# Alerting — Fluxiflow for Kitchen

## 1. Overview
`AlertEngine` (apps/monitoring/alerts.py) evaluates active `AlertRule`s on a 60s beat schedule. Each rule defines a **condition** and produces **Alert** instances with a lifecycle (ACTIVE → ACKNOWLEDGED → RESOLVED). Firing is cooldown-controlled and deduplicated per rule.

## 2. Alert Rules

| Field | Meaning |
|---|---|
| `name`, `description` | Human label |
| `severity` | LOW / MEDIUM / HIGH / CRITICAL |
| `service` | Which service the rule monitors |
| `condition_type` | `threshold` or `periodic` |
| `conditions` | JSON: `{"metric": "error_rate", "operator": ">", "value": 5.0}` (threshold) or `{"cron": "*/30 * * * *"}` (periodic) |
| `cooldown_minutes` | Minimum time between firing events for the same rule |
| `is_active`, `is_system` | Enable flag; system rules cannot be deleted |
| `channel` | Optional delivery channel (email/in-app) for notifications |

## 3. Threshold Metrics
Supported metric names (from `apps.monitoring.queries.get_metric_value`): `error_rate`, `latency_p95`, `latency_p99`, `request_count`, `failure_count`, `celery_failure_rate`, `celery_stuck_count`, `notification_failure_rate`, `webhook_failure_rate`, `slo_budget_remaining`, `slo_error_budget_burn`, and `models.<ModelName>.<field>` (e.g. `models.FailedLogin.count`).

## 4. Firing Behavior
1. `AlertEngine.evaluate()` loads active rules, computes metric values, and applies operators (`>`, `<`, `>=`, `<=`, `==`, `!=`).
2. On breach: an `Alert` is created (or an existing ACTIVE one is re-triggered, `trigger_count++`) respecting the cooldown.
3. Optional notifications are dispatched through the existing notification service (`system_alert` WS event) so kitchen/ops staff see alerts in the Notification Center.
4. When the condition clears, ACTIVE alerts are auto-resolved with a resolution note.

## 5. Alert Lifecycle
- `acknowledge/` — marks ACKNOWLEDGED (acknowledged_by/at recorded).
- `resolve/` — requires optional `resolution_note`; records resolved_by/at.
- Auto-resolve on condition clear.
- `trigger_count` tracks how many times the same alert condition re-fired.

## 6. System Defaults (`seeding.seed_defaults`)
Seeded alert rules cover: error-rate spike, p95 latency breach, task failure rate, stuck tasks, and notification failure rate — each MEDIUM/HIGH severity with sensible cooldowns.

## 7. Permissions & Audit
- Rules CRUD requires `monitoring.manage`; `toggle/` flips `is_active`.
- Rule create/update/toggle and alert resolve actions write audit log entries (entity types `ALERT_RULE`, `ALERT`).
- Rules are global (system-wide), not restaurant-scoped.