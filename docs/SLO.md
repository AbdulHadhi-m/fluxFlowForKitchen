# Service Level Objectives — Fluxiflow for Kitchen

## 1. Overview
`ServiceSLO` rows define SLI targets for core services. `SLOComputeService.evaluate_all()` runs hourly (beat) to refresh `latest_sli`, `latest_error_budget_remaining`, and burn-rate indicators. SLOs are internal targets (and may be marked `is_contractual` for client-facing commitments).

## 2. Default SLOs (seeded)

| Service | Type | Target | Contractual |
|---|---|---|---|
| API | availability | 99.9% | yes |
| API | latency (p95) | 99.0% (≤ 2s budget) | internal |
| Notifications | delivery | 99.0% | internal |
| Errors | error budget | 99.5% | internal |

## 3. SLI Computation (`slos.py`)
- **availability**: `1 - (window failures / window requests)` over the SLO window.
- **latency**: fraction of sampled requests under the latency budget (p95-bounded).
- **delivery**: `sent / (sent + failed)` over the window.
- **error budget**: `1 - (errors / total)` mapped to a percentage.

Results are written back to the SLO row (`latest_sli`, `latest_error_budget_remaining`, `last_evaluated_at`); a fresh `ErrorEvent` (module `slo`) is recorded when budget is exhausted.

## 4. Alerting Integration
Alert rules can reference `slo_budget_remaining` (threshold ≤ 0) and `slo_error_budget_burn` (rate of budget consumption) — see ALERTING.md §3.

## 5. API

| Endpoint | Action |
|---|---|
| `GET /slos/` | List SLOs with current SLI/budget |
| `POST /slos/` | Create (manage permission) |
| `GET /slos/<id>/` | Detail |
| `PATCH /slos/<id>/` | Update target/contractual flag |
| `POST /slos/<id>/evaluate/` | On-demand evaluation |
| `DELETE /slos/<id>/` | Remove |

## 6. UI
The Incidents page shows each SLO's latest SLI and remaining error budget with red highlighting when the budget is exhausted.