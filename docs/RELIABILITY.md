# Reliability — Fluxiflow for Kitchen

## 1. Celery Task Observability
`apps/monitoring/celery_instrumentation.py` registers Celery signals:
- `task_prerun` → creates `CeleryTaskRun` (task name, args-sha, correlation ID from headers).
- `task_postrun` → marks SUCCESS/FAILURE with duration.
- `task_failure` → FAILURE with error type/message (also feeds ErrorTracking as module `celery`).
- `task_retry` → RETRY with reason.
- Correlation IDs propagate through task headers (`propagate_correlation_id`), tying HTTP requests to async work.

## 2. Stuck Task Detection
`monitoring.detect_stuck_tasks` (every 5 min) flags RUNNING runs older than `celery_stuck_threshold_minutes` (15 min default): marks them STUCK, records a HIGH-severity `StuckTask` error event, and pages the monitoring UI.

## 3. WebSocket Monitoring
`WSMonitor` (apps/monitoring/ws_monitor.py) tracks live connections per channel (kitchen, notifications) via Redis. It is **non-blocking**: bounded read timeouts (0.5s connect, 1.0s read) and failure-silent, so consumer startup never hangs when Redis is down. `track_connect`/`track_disconnect` are invoked from the kitchen and notifications consumers.

## 4. External Calls & Deliveries
- **Webhooks** (`apps/workflows/actions/registry.py`): every `handle_webhook` execution records `WebhookDelivery` (status, HTTP code, duration, error_code).
- **Email** (`SEND_EMAIL` action + `apps/accounts/tasks.py`): records delivery metrics on success/failure.
- **Notifications** (`apps/notifications/services.py`): `dispatch_ws` records `NotificationDeliveryMetric` (REALTIME channel, SENT/FAILED).
- Aggregates feed `/monitoring/workflows/`, `/monitoring/notifications/`, `/monitoring/integrations/`.

## 5. Database Monitoring
`db_monitor.py` hooks `connection_created` and patches cursors to time queries; slow ones land in `SlowQueryLog` (see METRICS.md §4).

## 6. Health & Alerting
Readiness probe checks critical dependencies (HEALTH_CHECKS.md). Alert rules can key off `celery_failure_rate`, `celery_stuck_count`, `webhook_failure_rate`, `notification_failure_rate` (ALERTING.md §3).

## 7. Boot Checks
Production startup runs `config/startup.py` config checks (settings sanity, required dirs, beat wiring) and logs warnings — fail-fast is off so a degraded node still boots and reports itself unhealthy via readiness.