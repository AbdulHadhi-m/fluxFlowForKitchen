# Observability — Fluxiflow for Kitchen

## 1. Purpose
Observability collects structured signals (logs, metrics, traces, events, health) across the platform into one REST API and UI so operators can detect, diagnose, and resolve problems without hunting through scattered sources.

## 2. The Four Pillars

| Pillar | Source | Stored In |
|---|---|---|
| Logs | Django LOGGING (text dev / JSON prod) | Console, optional rotating files |
| Metrics | `RequestMetric` aggregation + latency samples | `apps_monitoring_*` tables |
| Events | Audit log + external calls + WS + Celery run records | `apps_monitoring_*` tables |
| Health | Liveness/Readiness/Dependencies probes | `/api/v1/health/*` |

## 3. Architecture

```
 Frontend (reportError) ─► POST /monitoring/errors/   ─┐
 Django middleware ──────► RequestMetric              ─┤
 Celery signals ─────────► CeleryTaskRun              ─┤─► apps_monitoring tables
 External calls ─────────► Webhook/ExternalService    ─┤
 Notification sends ─────► NotificationDeliveryMetric ─┘
 Beat schedules ─────────► evaluate_alerts / detect_stuck_tasks / evaluate_slos / cleanup
```

## 4. Key Principles
- **No secrets in logs**: every log message and error report passes through redaction (tokens, passwords, JWTs) before output.
- **Whitelist-only error reporting**: the frontend `reportError` only sends message, error type, component, URL, and fingerprint — never DOM content or localStorage.
- **Normalized paths**: request metrics strip UUIDs so `/orders/{uuid}` aggregates instead of exploding cardinality.
- **Bounded storage**: retention jobs purge raw records daily (defaults: 30d metrics, 90d errors, 365d audit).
- **Non-blocking**: WebSocket monitoring uses bounded, non-blocking Redis reads; middleware skips health/monitoring endpoints.

## 5. Frontend Integration
- `src/lib/monitor.ts` batches and throttles error reports (max 25 pending, flush every 3s) via `fetch(..., { keepalive: true })`.
- `ErrorBoundary` reports unhandled component errors; the API client reports failed requests (auth endpoints excluded).
- Backend always returns 201/200 for these reports regardless of load — they never fail the UI.

## 6. Related Docs
See MONITORING.md (models/APIs), LOGGING.md (redaction), METRICS.md, ERROR_TRACKING.md, ALERTING.md, INCIDENTS.md, HEALTH_CHECKS.md, SLO.md, RELIABILITY.md, and OPERATIONS_RUNBOOK.md.