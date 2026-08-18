# Operations Runbook — Fluxiflow for Kitchen

## 1. First Response

| Signal | Action |
|---|---|
| `/api/v1/health/ready/` returns 503 | Postgres is unreachable. Check `docker ps` for the db container, then `docker logs <db>`. |
| Alerts page shows ACTIVE critical alerts | Open Alerts → Acknowledge → investigate → Resolve with a note. |
| Error Tracking shows CRITICAL spikes | Filter by module/endpoint, open logs with the correlation ID, fix, then mark RESOLVED. |
| Incidents open | Acknowledge within MTTA target, append timeline notes, resolve when verified. |
| Stuck tasks flagged | Restart the celery worker service (`docker compose restart celery-worker`); beat re-detects. |

## 2. Where to Look
1. **Alerts** (`/monitoring/alerts`) — what breached.
2. **Error Tracking** (`/monitoring/errors`) — which code path failed.
3. **Jobs** (`/monitoring/jobs`) — worker/queue/stuck state.
4. **Integrations** (`/monitoring/integrations`) — webhook/WS failures.
5. **System Health** (`/monitoring/health`) — dependency status + latency.
6. **Logs** — `docker compose logs -f api` (JSON lines; grep the correlation ID).

## 3. Routine Operations

| Task | Command / Path |
|---|---|
| Restart API | `docker compose restart api` |
| Restart workers + beat | `docker compose restart celery-worker celery-beat` |
| View logs | `docker compose logs -f api celery-worker celery-beat` |
| Run migrations | `docker compose exec api python manage.py migrate` |
| Seed defaults (first boot) | automatic on boot; manual: `python manage.py seed` |
| Evaluate alerts now | `docker compose exec api celery -A config call monitoring.evaluate_alerts` |
| Evaluate SLOs now | `docker compose exec api celery -A config call monitoring.evaluate_slos` |
| Purge old metrics | nightly `monitoring.cleanup_monitoring_data` (02:00); manual: `docker compose exec api celery -A config call monitoring.cleanup_monitoring_data` |

## 4. Configuration Changes
- Operator-facing: `GET/PATCH /api/v1/monitoring/config/` (cooldowns, thresholds, retention days). Changes are audit-logged.
- Alert rules: `GET/POST /api/v1/monitoring/alert-rules/` + `toggle/`; create/update/toggle audit-logged.
- Env-level: `MONITORING_*` settings require a deploy (documented in MONITORING.md §6).

## 5. Incidents: Standard Workflow
1. Open incident (from critical alert or manual) → status OPEN.
2. Acknowledge (starts MTTA clock) → ACKNOWLEDGED.
3. Investigate; add timeline notes (`notes/`) as facts are learned → INVESTIGATING.
4. Verify fix in monitoring + logs → Resolve with resolution notes (MTTR recorded).

## 6. Alert Rule Reference (seeded defaults)
Error-rate spike (> 5% in 5m), p95 latency > 2s, task failure rate > 10%, stuck tasks > 0, notification failure rate > 5%. All MEDIUM/HIGH severity, 5–15 min cooldowns.

## 7. Security Reminders
- Never paste tokens/emails into incident notes — redaction applies to logs, not stored notes.
- `/health/*` endpoints are unauthenticated by design; they expose no configuration or secrets.
- Grant `monitoring.manage` only to operators who need system-wide views.