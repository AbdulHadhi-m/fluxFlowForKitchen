"""Metric aggregation queries for the alert engine and monitoring dashboards.

All aggregations are low-cardinality: grouped by normalized route/service,
never by raw entity IDs.
"""
import time
from datetime import timedelta

from django.db.models import Avg, Count, F, Max, Q, Sum
from django.utils import timezone

from apps.monitoring.models import (
    CeleryTaskRun,
    ErrorEvent,
    ExternalServiceMetric,
    NotificationDeliveryMetric,
    RequestLatencySample,
    RequestMetric,
    SlowQueryLog,
    WebhookDelivery,
)


def _window_start(window_minutes: int):
    return timezone.now() - timedelta(minutes=window_minutes)


def _pct(part: int, total: int) -> float:
    if not total:
        return 0.0
    return round(part / total * 100, 2)


def request_summary(window_minutes: int = 5) -> dict:
    """Counts + error breakdown over the window."""
    start = _window_start(window_minutes)
    rows = list(
        RequestMetric.objects.filter(bucket_minute__gte=start)
        .values("status_class")
        .annotate(count=Sum("count"), error_count=Sum("error_count"))
    )
    total = sum(r["count"] or 0 for r in rows)
    errors = sum(r["error_count"] or 0 for r in rows)
    by_class = {r["status_class"]: r["count"] or 0 for r in rows}
    return {
        "total": total,
        "errors": errors,
        "by_class": by_class,
        "error_rate": _pct(errors, total),
    }


def latency_percentiles(window_minutes: int = 30) -> dict:
    """Approximate latency percentiles from sampled requests."""
    start = _window_start(window_minutes)
    samples = list(
        RequestLatencySample.objects.filter(sampled_at__gte=start).values_list("duration_ms", flat=True)
    )
    if not samples:
        return {"p50": None, "p95": None, "p99": None, "avg": None, "samples": 0, "max": None}

    samples.sort()

    def pct(p):
        idx = min(len(samples) - 1, int(len(samples) * p))
        return samples[idx]

    return {
        "p50": pct(0.50),
        "p95": pct(0.95),
        "p99": pct(0.99),
        "avg": int(sum(samples) / len(samples)),
        "samples": len(samples),
        "max": samples[-1],
    }


def top_slow_endpoints(window_minutes: int = 60, limit: int = 10) -> list:
    """Slowest endpoints by average duration (bucket-averaged, low cardinality)."""
    start = _window_start(window_minutes)
    rows = list(
        RequestMetric.objects.filter(bucket_minute__gte=start)
        .values("method", "endpoint")
        .annotate(total_count=Sum("count"), total_ms=Sum("total_duration_ms"), max_duration_ms=Max("max_duration_ms"))
        .order_by("-max_duration_ms")[:limit * 3]
    )
    result = []
    for row in rows:
        if row["total_count"]:
            result.append({
                "method": row["method"],
                "endpoint": row["endpoint"],
                "count": row["total_count"],
                "avg_duration_ms": int(row["total_ms"] / row["total_count"]),
                "max_duration_ms": row["max_duration_ms"],
            })
    result.sort(key=lambda r: r["avg_duration_ms"], reverse=True)
    return result[:limit]


def db_stats(window_minutes: int = 1440, limit: int = 20) -> dict:
    """Slow-query and database health aggregates."""
    from apps.core.health import check_postgres

    start = _window_start(window_minutes)
    slow_queries = list(
        SlowQueryLog.objects.filter(last_seen__gte=start).order_by("-duration_ms")[:limit].values(
            "signature", "duration_ms", "count", "last_seen"
        )
    )
    db_check = check_postgres()
    return {
        "connection_status": db_check["status"],
        "latency_ms": db_check["latency_ms"],
        "slow_query_count": len(slow_queries),
        "slowest_duration_ms": slow_queries[0]["duration_ms"] if slow_queries else None,
        "slow_queries": slow_queries,
    }


def celery_stats(window_minutes: int = 60) -> dict:
    """Celery task run aggregates."""
    start = _window_start(window_minutes)
    base = CeleryTaskRun.objects.filter(started_at__gte=start)
    total = base.count()
    failed = base.filter(status="FAILURE").count()
    retried = base.filter(status="RETRY").count()
    succeeded = base.filter(status="SUCCESS").count()
    running = base.filter(status="RUNNING").count()
    avg_duration = base.filter(duration_ms__isnull=False).aggregate(avg=Avg("duration_ms"))["avg"]
    return {
        "total": total,
        "succeeded": succeeded,
        "failed": failed,
        "retried": retried,
        "running": running,
        "failure_rate": _pct(failed, total),
        "avg_duration_ms": int(avg_duration) if avg_duration else None,
        "by_task": list(
            base.values("task_name")
            .annotate(total=Count("id"), failed=Count("id", filter=Q(status="FAILURE")))
            .order_by("-total")[:20]
        ),
    }


def notification_stats(window_minutes: int = 1440) -> dict:
    """Notification delivery aggregates (measured, not duplicated)."""
    start = _window_start(window_minutes)
    base = NotificationDeliveryMetric.objects.filter(created_at__gte=start)
    total = base.count()
    failed = base.filter(status="FAILED").count()
    sent = base.filter(status="SENT").count()
    retried = base.filter(status="RETRY").count()
    return {
        "total": total,
        "sent": sent,
        "failed": failed,
        "retried": retried,
        "failure_rate": _pct(failed, total),
        "by_channel": list(
            base.values("channel").annotate(total=Count("id"), failed=Count("id", filter=Q(status="FAILED")))
        ),
    }


def webhook_stats(window_minutes: int = 1440) -> dict:
    """Outbound webhook delivery aggregates."""
    start = _window_start(window_minutes)
    base = WebhookDelivery.objects.filter(created_at__gte=start)
    total = base.count()
    failed = base.filter(success=False).count()
    signature_failures = base.filter(signature_valid=False).count()
    rate_limited = base.filter(rate_limited=True).count()
    avg_duration = base.filter(duration_ms__isnull=False).aggregate(avg=Avg("duration_ms"))["avg"]
    return {
        "total": total,
        "failed": failed,
        "success_rate": 100 - _pct(failed, total),
        "signature_failures": signature_failures,
        "rate_limited": rate_limited,
        "avg_duration_ms": int(avg_duration) if avg_duration else None,
    }


def integration_stats(window_minutes: int = 1440) -> list:
    """Per-external-service aggregates for the integrations dashboard."""
    start = _window_start(window_minutes)
    base = ExternalServiceMetric.objects.filter(created_at__gte=start)
    rows = list(
        base.values("service")
        .annotate(
            total=Count("id"),
            failed=Count("id", filter=Q(status__in=["FAILURE", "TIMEOUT", "RATE_LIMITED"])),
            avg_duration=Avg("duration_ms"),
            last_success=Max("created_at", filter=Q(status="SUCCESS")),
        )
        .order_by("service")
    )
    for row in rows:
        row["failure_rate"] = _pct(row["failed"], row["total"])
        row["avg_duration_ms"] = int(row["avg_duration"]) if row["avg_duration"] else None
        row["last_success"] = row["last_success"].isoformat() if row["last_success"] else None
    return rows


def workflow_stats(window_minutes: int = 1440) -> dict:
    """Workflow execution metrics computed directly from the workflow engine
    models (Prompt 33) — no duplicate analytics system."""
    from apps.workflows.models import ExecutionStatus, WorkflowExecution, WorkflowStepExecution

    start = _window_start(window_minutes)
    base = WorkflowExecution.objects.filter(started_at__gte=start)
    total = base.count()
    failed = base.filter(status=ExecutionStatus.FAILED).count()
    completed = base.filter(status=ExecutionStatus.COMPLETED).count()
    waiting = base.filter(status=ExecutionStatus.WAITING).count()
    approval_waiting = base.filter(status=ExecutionStatus.APPROVAL_REQUIRED).count()
    running = base.filter(status=ExecutionStatus.RUNNING).count()
    retried = base.exclude(attempt_count=0).count()

    timeout_threshold = timezone.now() - timedelta(minutes=120)
    timed_out = base.filter(status=ExecutionStatus.RUNNING, started_at__lt=timeout_threshold).count()

    durations = list(
        base.filter(started_at__isnull=False, completed_at__isnull=False)
        .values_list("started_at", "completed_at")
    )
    avg_seconds = None
    if durations:
        total_seconds = sum((end - start).total_seconds() for start, end in durations)
        avg_seconds = int(total_seconds / len(durations))

    failing_steps = list(
        WorkflowStepExecution.objects.filter(status="FAILED", completed_at__gte=start)
        .values("step_code", "step_type")
        .annotate(failures=Count("id"), avg_duration=Avg("duration_seconds"))
        .order_by("-failures")[:10]
    )

    return {
        "total": total,
        "completed": completed,
        "failed": failed,
        "running": running,
        "waiting": waiting,
        "approval_waiting": approval_waiting,
        "retried": retried,
        "timed_out": timed_out,
        "success_rate": _pct(completed, total),
        "failure_rate": _pct(failed, total),
        "avg_duration_seconds": avg_seconds,
        "failing_steps": failing_steps,
    }


def error_event_stats(window_minutes: int = 60) -> dict:
    start = _window_start(window_minutes)
    base = ErrorEvent.objects.filter(last_seen__gte=start)
    return {
        "count": base.count(),
        "critical": base.filter(severity="CRITICAL").count(),
        "high": base.filter(severity="HIGH").count(),
        "new": base.filter(status="NEW").count(),
        "by_module": list(base.values("module").annotate(total=Count("id")).order_by("-total")),
    }


def get_metric_value(metric_type: str, window_minutes: int = 5):
    """Evaluate a named metric for the alert engine."""
    if metric_type == "api_error_rate":
        return request_summary(window_minutes)["error_rate"]
    if metric_type == "api_5xx_count":
        return request_summary(window_minutes)["by_class"].get("5xx", 0)
    if metric_type == "api_p95_latency":
        return latency_percentiles(window_minutes)["p95"] or 0
    if metric_type == "api_p50_latency":
        return latency_percentiles(window_minutes)["p50"] or 0
    if metric_type == "api_p99_latency":
        return latency_percentiles(window_minutes)["p99"] or 0
    if metric_type == "db_healthy":
        from apps.core.health import check_postgres

        return 1.0 if check_postgres()["status"] == "HEALTHY" else 0.0
    if metric_type == "redis_healthy":
        from apps.core.health import check_redis

        return 1.0 if check_redis()["status"] == "HEALTHY" else 0.0
    if metric_type == "celery_workers":
        from apps.core.health import check_celery_worker

        return float(check_celery_worker()["workers"] or 0)
    if metric_type == "celery_queue_depth":
        return queue_depth()
    if metric_type == "celery_failure_rate":
        return celery_stats(window_minutes)["failure_rate"]
    if metric_type == "celery_retry_volume":
        return celery_stats(window_minutes)["retried"]
    if metric_type == "workflow_failure_rate":
        return workflow_stats(window_minutes)["failure_rate"]
    if metric_type == "workflow_timeouts":
        return workflow_stats(window_minutes)["timed_out"]
    if metric_type == "webhook_failure_rate":
        return 100 - webhook_stats(window_minutes)["success_rate"]
    if metric_type == "webhook_failure_count":
        return webhook_stats(window_minutes)["failed"]
    if metric_type == "notification_failure_rate":
        return notification_stats(window_minutes)["failure_rate"]
    if metric_type == "error_spike_count":
        return error_event_stats(window_minutes)["count"]
    if metric_type == "integration_failure_rate":
        rows = integration_stats(window_minutes)
        totals = sum(r["total"] for r in rows)
        failed = sum(r["failed"] for r in rows)
        return _pct(failed, totals)
    return None


def queue_depth(queue: str = "celery") -> int:
    """Celery queue depth via broker inspection (non-raising)."""
    try:
        import redis as redis_lib
        from django.conf import settings

        client = redis_lib.from_url(settings.CELERY_BROKER_URL, socket_connect_timeout=1)
        depth = int(client.llen(queue) or 0)
        client.close()
        return depth
    except Exception:  # pragma: no cover - broker unavailable
        return -1


def oldest_queued_task_age_seconds(queue: str = "celery") -> int:
    """Best-effort age of the oldest queued message (0 if unknown)."""
    try:
        import json as json_lib
        import redis as redis_lib
        from django.conf import settings

        client = redis_lib.from_url(settings.CELERY_BROKER_URL, socket_connect_timeout=1)
        messages = client.lrange(queue, -1, -1)
        client.close()
        if not messages:
            return 0
        body = json_lib.loads(messages[0])
        timestamp = body.get("properties", {}).get("timestamp")
        if timestamp:
            return max(0, int(time.time() - timestamp))
        return 0
    except Exception:  # pragma: no cover
        return 0