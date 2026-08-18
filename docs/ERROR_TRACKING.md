# Error Tracking — Fluxiflow for Kitchen

## 1. Concept
Errors are deduplicated by **fingerprint** = SHA-256 of (error_type, normalized message, module, normalized endpoint). Repeated occurrences increment `count` instead of creating new rows, keeping the list actionable.

## 2. Ingestion Paths

| Source | Hook |
|---|---|
| Unhandled Django 500s | `apps/core/exceptions.py` records via `ErrorTrackingService.record_exception` |
| Celery task failures | `celery_instrumentation.py` `task_failure` signal (module `celery`) |
| Stuck tasks | `monitoring.detect_stuck_tasks` beat task |
| Frontend JS errors | `POST /monitoring/errors/` (whitelist-only, batched, keepalive) |
| Failed API requests (client-side) | `src/lib/api-client.ts` interceptor → `reportRequestFailure` |
| Explicit service calls | `ErrorTrackingService.record(...)` anywhere in the backend |

## 3. ErrorEvent Fields
`error_type`, `message`, `module` (api/celery/frontend/background…), `severity` (LOW/MEDIUM/HIGH/CRITICAL), `status` (NEW/ACKNOWLEDGED/INVESTIGATING/RESOLVED/IGNORED), `count`, `first_seen`, `last_seen`, `endpoint`, `environment`, `correlation_id`, `metadata` (sanitized, keys allowlisted).

## 4. Status Workflow
NEW → (Acknowledge) ACKNOWLEDGED → (Investigate) INVESTIGATING → (Resolve) RESOLVED. IGNORED for known noise. Status transitions are PATCHable from the UI and preserved per event (repeat occurrences keep the last status).

## 5. Frontend Safety (`src/lib/monitor.ts`)
- Sends only allowlisted fields: message, error type, component, URL, fingerprint.
- Batch of ≤25 pending reports, flush every 3s, `keepalive: true`, fire-and-forget (never blocks UI or throws).
- Backend responds 201/200 with no side effects beyond recording; errors during reporting are swallowed.

## 6. Surface
- `/api/v1/monitoring/errors/` — list with filters (status, severity, module, search, time preset) + pagination.
- `/api/v1/monitoring/errors/<id>/` — detail + PATCH status.
- Admin: `ErrorEventAdmin` with quick filters and read-only fingerprint fields.