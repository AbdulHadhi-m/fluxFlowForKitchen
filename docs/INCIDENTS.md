# Incidents — Fluxiflow for Kitchen

## 1. Overview
`MonitoringIncident` formalizes operational incidents (unlike `apps.security` incidents, which are security-focused). Incidents are created from critical alerts or manually, tracked through a lifecycle, and annotated with timeline notes.

## 2. Lifecycle

```
 OPEN ──acknowledge──► ACKNOWLEDGED ──(investigate)──► INVESTIGATING ──resolve──► RESOLVED
   │                                                                            │
   └────────────────────────────── resolve ────────────────────────────────────┘
```

## 3. Fields
`title`, `description`, `severity` (reused ErrorSeverity levels), `status`, `affected_service` (from `MonitoringService`), `source_alert` (FK, optional), `detected_at`, `acknowledged_at`, `resolved_at`, `resolution_notes`, plus computed `mtta_minutes` and `mttr_minutes` (stored at resolve time).

## 4. Timeline
Every lifecycle event appends to `timeline` JSON: `{timestamp, type, actor, text}`. Types: `detected`, `acknowledged`, `investigating`, `resolved`, `note`. Operators can append free-form `note` entries via `POST /incidents/<id>/notes/`.

## 5. Metrics
- MTTA = median time from detection to acknowledgment (across window).
- MTTR = median time from detection to resolution.
- Computed by `IncidentService.compute_metrics(window_days=30)` and surfaced in `GET /incidents/` alongside the list.

## 6. API

| Endpoint | Action |
|---|---|
| `GET /incidents/` | List (filter by status/severity) + metrics envelope |
| `GET /incidents/<id>/` | Detail incl. timeline |
| `POST /incidents/<id>/acknowledge/` | Acknowledge |
| `POST /incidents/<id>/resolve/` | Resolve with optional notes |
| `POST /incidents/<id>/notes/` | Append timeline note |

## 7. Audit & Permissions
- Requires `monitoring.manage`.
- Acknowledge/resolve/note actions are audit-logged (entity type `MONITORING_INCIDENT`).
- Incident CRUD is also available in Django admin (`MonitoringIncidentAdmin`).

## 8. Automatic Creation
When a CRITICAL alert fires, operators may promote it to an incident via the Alerts page / admin; the `source_alert` link keeps alert context attached to the incident.