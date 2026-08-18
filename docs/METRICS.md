# Metrics — Fluxiflow for Kitchen

## 1. Request Metrics
`RequestMetricsMiddleware` runs before `SecureTenantContextMiddleware` and aggregates per endpoint:
- Per-minute counts, error counts, and duration stats (avg, max, p50/p95/p99) in `RequestMetric`.
- `normalize_path()` strips UUIDs/IDs so cardinality stays bounded (e.g. `/orders/{uuid}` becomes `/orders/{uuid}/`).
- A sampled subset (default 10%) is stored in `RequestLatencySample` for precise percentile math.
- Health/liveness/monitoring endpoints are excluded from metrics and request logging to avoid self-instrumentation noise.

## 2. Latency Percentiles
Percentiles are computed across the sampled window using NumPy quantiles:
- p50: median experience
- p95: typical worst-case user experience (dashboard "P95 Latency" card)
- p99: tail experience (alerted on by SLO rules)

## 3. Error Rate
`error_rate = error_count / count` per endpoint and overall. The Overview card flags red above 5%; alert rules can trigger on configurable thresholds.

## 4. Slow Queries
`db_monitor.py` patches the Django DB cursor at connection-created time (`connection_created` signal):
- Queries over `MONITORING_SLOW_QUERY_THRESHOLD_MS` (500ms) are normalized (`normalize_query_signature`) and recorded in `SlowQueryLog` with duration and count.
- Visible under `/api/v1/monitoring/database/` and in the Monitoring UI.

## 5. Retention
- Raw request metrics: 30 days. Latency samples: 7 days. Slow queries: 30 days. Error events: 90 days.
- `monitoring.cleanup_monitoring_data` runs nightly (02:00) and deletes in batches to avoid long transactions.

## 6. Derived Views
- `/monitoring/overview/` — composite metrics + dependencies + incident summaries.
- `/monitoring/metrics/` — window aggregates + top slow endpoints.
- `/monitoring/health/` — dependency latency.
- Workflow, notification, integration, and database stats are computed from their own recorder tables (see RELIABILITY.md).