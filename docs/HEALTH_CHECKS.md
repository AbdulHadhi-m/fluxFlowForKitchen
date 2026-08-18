# Health Checks — Fluxiflow for Kitchen

## 1. Endpoints

| Endpoint | Auth | Meaning |
|---|---|---|
| `/api/v1/health/live/` | None | Process is alive. Always 200 while the server runs. |
| `/api/v1/health/ready/` | None | 200 when no **critical** dependency is unhealthy; 503 otherwise. |
| `/api/v1/health/dependencies/` | None | Per-dependency probe results. |
| `/api/v1/health/` | None | Backward-compatible composite: `{success, data, service, dependencies}` with `database`/`redis`/`celery`/`websocket` keys (remapped from `postgres`). |
| `/api/v1/monitoring/health/` | Bearer | Same probes, richer shape (latency per dep, details, error text). |

## 2. Readiness Semantics
- `critical_unhealthy` = any dependency marked critical (postgres) with UNHEALTHY status.
- Ready → 200 when no critical dependency is unhealthy. Degraded-but-safe (e.g. Redis or a Celery worker down) still returns 200 so load balancers do not drain a partially working node.
- The readiness endpoint does not require auth and never leaks configuration details — only names, status, and latency.

## 3. Probes

| Dependency | Probe |
|---|---|
| postgres | `connection.ensure_connection()` with 1s timeout |
| redis | `ping()` with 1s timeout (non-critical) |
| celery | Worker liveness via celery inspect (non-critical; unknown when broker is down) |
| websocket | Redis pub/sub channel availability (non-critical) |

## 4. Version Info
Health responses include `version`, `commit_sha`, and `environment` from `apps.core.version` (populated at build time by the Docker image).

## 5. Startup Checks
In production, `run_config_checks(fail_fast=False)` runs on boot and logs warnings for missing/unwired subsystems instead of crashing the container.

## 6. Operators
- Point the orchestrator liveness probe at `/api/v1/health/live/` (interval 10s, timeout 2s).
- Point the readiness probe at `/api/v1/health/ready/` (interval 15s, timeout 3s).
- Any 503 means postgres connectivity is broken — page operators immediately.