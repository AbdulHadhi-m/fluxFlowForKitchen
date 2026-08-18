"""Slow query detection via database connection instrumentation.

Queries slower than the configured threshold are aggregated by normalized
signature (parameter values stripped — privacy by design) and recorded to
SlowQueryLog. Instrumentation is fully non-blocking and fail-safe.
"""
import logging
import threading
import time

from django.db import connection
from django.db.backends.signals import connection_created
from django.db.models import F
from django.utils import timezone

from apps.monitoring.services import ConfigService, normalize_query_signature

logger = logging.getLogger("fluxiflow.monitoring.db")
_tls = threading.local()


def _record_slow_query(signature: str, duration_ms: int) -> None:
    """Aggregate a slow query into SlowQueryLog (never raises, re-entrant safe)."""
    if getattr(_tls, "in_recording", False):
        return
    _tls.in_recording = True
    try:
        from apps.monitoring.context import correlation_id_ctx
        from apps.monitoring.models import SlowQueryLog

        config = ConfigService.get()
        if duration_ms < config.slow_query_threshold_ms:
            return

        now = timezone.now()
        correlation_id = correlation_id_ctx.get() or ""
        row, created = SlowQueryLog.objects.get_or_create(
            signature=signature,
            defaults={
                "duration_ms": duration_ms,
                "count": 1,
                "first_seen": now,
                "last_seen": now,
                "correlation_id": correlation_id,
            },
        )
        if not created:
            SlowQueryLog.objects.filter(pk=row.pk).update(
                count=F("count") + 1,
                duration_ms=duration_ms,
                last_seen=now,
            )
        logger.warning(
            "slow.query",
            extra={"operation": "slow_query", "duration_ms": duration_ms, "query": signature[:200]},
        )
    except Exception:  # pragma: no cover
        logger.debug("Slow query recording skipped (non-fatal)", exc_info=True)
    finally:
        _tls.in_recording = False


def patch_cursor(cursor):
    """Wrap execute/executemany on a single cursor to measure durations."""
    original_execute = cursor.execute
    original_executemany = cursor.executemany

    def execute(sql, params=None):
        started = time.monotonic()
        try:
            return original_execute(sql, params)
        finally:
            _record_slow_query(normalize_query_signature(sql), int((time.monotonic() - started) * 1000))

    def executemany(sql, param_list):
        started = time.monotonic()
        try:
            return original_executemany(sql, param_list)
        finally:
            _record_slow_query(normalize_query_signature(sql), int((time.monotonic() - started) * 1000))

    cursor.execute = execute
    cursor.executemany = executemany
    return cursor


def _patched_cursor_factory(db_connection):
    original_cursor = db_connection.cursor

    def cursor():
        return patch_cursor(original_cursor())

    return cursor


@connection_created.connect
def on_connection_created(sender, connection, **kwargs):
    """Instrument every new database connection with slow-query detection."""
    try:
        if hasattr(connection, "cursor"):
            connection.cursor = _patched_cursor_factory(connection)
    except Exception:  # pragma: no cover
        logger.debug("Slow query instrumentation skipped", exc_info=True)