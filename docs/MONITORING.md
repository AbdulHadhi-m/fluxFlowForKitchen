# Monitoring — Fluxiflow for Kitchen

## 1. System Overview
The `apps.monitoring` Django app records operational signals and exposes them through `/api/v1/monitoring/*`. It reuses the existing audit, notification, and incident frameworks — it does not duplicate them.

## 2. Data Model (13 tables)

| Model | Records |
|---|---|
| `RequestMetric` | Per-minute request aggregates (count, error_count, duration avg/max, latency percentiles p50/p95/p99, by endpoint + method) |
| `RequestLatencySample` | Sampled request durations (default 10% sample rate) |
| `SlowQueryLog` | SQL queries slower than `slow_query_threshold_ms` (500ms default) |
| `CeleryTaskRun` | Every Celery task execution (RUNNING/SUCCESS/FAILURE/RETRY/STUCK) with correlation ID |
| `ErrorEvent` | Fingerprint-grouped application errors (severity, status, count, endpoint, environment) |
| `NotificationDeliveryMetric` | In-app/email delivery outcomes |
| `WebhookDelivery` | Outbound webhook call results |
| `ExternalServiceMetric` | External API call aggregates by service |
| `AlertRule` | Threshold/periodic alert conditions with conditions JSON |
| `Alert` | Fired alert instances (ACTIVE/ACKNOWLEDGED/RESOLVED) |
| `MonitoringIncident` | Incident lifecycle with timeline, MTTA/MTTR |
| `ServiceSLO` | SLI/SLO targets, budgets, contractual flag |
| `MonitoringConfig` | Single-row operator configuration + retention policies |

## 3. API Surface (`/api/v1/monitoring/`)

| Endpoint | Purpose |
|---|---|
| `overview/` | Composite dashboard payload (requests, latency, errors, alerts, incidents, dependencies) |
| `errors/`, `errors/<id>/` | Error events list/detail + PATCH status |
| `metrics/` | Request metrics + top slow endpoints |
| `health/` | Dependency probe results |
| `jobs/` | Celery workers, queue depth, task outcomes, stuck tasks |
| `workflows/`, `notifications/`, `integrations/`, `database/` | Feature-specific reliability stats |
| `alerts/`, `alerts/<id>/acknowledge|resolve/` | Alert lifecycle |
| `alert-rules/`, `alert-rules/<id>/toggle/` | Alert rule CRUD + enable/disable |
| `incidents/`, `incidents/<id>/acknowledge|resolve|notes/` | Incident lifecycle + timeline notes |
| `slos/`, `slos/<id>/evaluate/` | SLO management + on-demand evaluation |
| `config/` | Monitoring configuration (GET/PATCH) |

## 4. Permissions
- `monitoring.view` — restaurant-scoped dashboards (Overview, Error Tracking, Health); granted to MANAGER and above.
- `monitoring.manage` — system-wide sections (Jobs, Integrations, Alerts, Incidents, SLOs, Config); RESTAURANT_ADMIN has it via `"*"`. MANAGER receives 403 on these.

## 5. Scheduled Tasks (Celery beat)

| Task | Schedule |
|---|---|
| `monitoring.evaluate_alerts` | every 60s |
| `monitoring.detect_stuck_tasks` | every 300s |
| `monitoring.evaluate_slos` | every 3600s |
| `monitoring.cleanup_monitoring_data` | daily 02:00 (crontab) |

## 6. Configuration (`MONITORING_*` settings + `MonitoringConfig` row)
- `MONITORING_ENABLED`, `MONITORING_METRICS_ENABLED`, `MONITORING_REQUEST_LOGGING`
- `MONITORING_LATENCY_SAMPLE_RATE` (0.1), `MONITORING_SLOW_QUERY_THRESHOLD_MS` (500)
- `MONITORING_STUCK_TASK_THRESHOLD_MINUTES` (15), `MONITORING_CRITICAL_DEPENDENCIES` (postgres: true, redis: false)
- `MonitoringConfig`: alert cooldown, thresholds, retention days per table, evaluation settings (editable via `/monitoring/config/`; changes logged to audit).

## 7. Seeding
`seed_defaults()` creates a default `MonitoringConfig` and four SLO rows (API availability, API latency, notification delivery, error budget) on first boot.