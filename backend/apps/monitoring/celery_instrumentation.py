"""Celery instrumentation: per-task execution tracking, correlation ID
propagation, and retry/failure recording — all via Celery signals.

Correlation propagation: the ambient correlation ID is attached to outbound
task headers (before_task_publish) and restored in the worker (task_prerun),
so logs and metrics stay correlated across process boundaries.
"""
import logging
import threading
import uuid

from celery import signals
from django.utils import timezone

from apps.monitoring.context import correlation_id_ctx
from apps.monitoring.constants import TaskRunStatus

logger = logging.getLogger("fluxiflow.monitoring.celery")

_run_registry = {}
_run_registry_lock = threading.Lock()


def _register_run(task_id: str, run_id) -> None:
    with _run_registry_lock:
        _run_registry[task_id] = run_id
        if len(_run_registry) > 4096:
            _run_registry.clear()


def _pop_run(task_id: str):
    with _run_registry_lock:
        return _run_registry.pop(task_id, None)


def _create_run(task) -> None:
    """Persist a RUNNING row for the task; recover failures silently."""
    try:
        from apps.monitoring.models import CeleryTaskRun

        headers = dict(getattr(task.request, "headers", {}) or {})
        correlation_id = headers.get("X-Correlation-ID") or correlation_id_ctx.get() or ""
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        correlation_id_ctx.set(correlation_id)

        run = CeleryTaskRun.objects.create(
            task_name=task.name or "unknown",
            status=TaskRunStatus.RUNNING,
            retry_count=getattr(task.request, "retries", 0) or 0,
            correlation_id=correlation_id,
            started_at=timezone.now(),
        )
        _register_run(task.request.id, run.pk)
    except Exception:  # pragma: no cover
        logger.debug("Celery run tracking skipped (non-fatal)", exc_info=True)


def _finish_run(task, status: str, error_type: str = "", error_message: str = "") -> None:
    try:
        from apps.monitoring.models import CeleryTaskRun

        run_id = _pop_run(task.request.id)
        if run_id is None:
            return
        finished = timezone.now()
        duration_ms = None
        try:
            run = CeleryTaskRun.objects.get(pk=run_id)
            duration_ms = int((finished - run.started_at).total_seconds() * 1000)
            CeleryTaskRun.objects.filter(pk=run_id).update(
                status=status,
                duration_ms=duration_ms,
                finished_at=finished,
                retry_count=getattr(task.request, "retries", 0) or 0,
                error_type=error_type[:255],
                error_message=error_message[:2000],
            )
        except CeleryTaskRun.DoesNotExist:
            return
    except Exception:  # pragma: no cover
        logger.debug("Celery run finalization skipped (non-fatal)", exc_info=True)


@signals.before_task_publish.connect
def propagate_correlation_id(sender=None, headers=None, **kwargs):
    """Attach the ambient correlation ID to outbound task messages."""
    try:
        current = correlation_id_ctx.get() or ""
        if current and headers is not None:
            headers["X-Correlation-ID"] = current
    except Exception:  # pragma: no cover
        pass


@signals.task_prerun.connect
def on_task_prerun(task_id, task, args, kwargs, **kw):
    try:
        _create_run(task)
    except Exception:  # pragma: no cover
        logger.debug("task_prerun handler failed (non-fatal)", exc_info=True)


@signals.task_postrun.connect
def on_task_postrun(task_id, task, retval, state, **kw):
    try:
        status = TaskRunStatus.SUCCESS if state == "SUCCESS" else TaskRunStatus.REVOKED
        _finish_run(task, status)
    except Exception:  # pragma: no cover
        logger.debug("task_postrun handler failed (non-fatal)", exc_info=True)


@signals.task_failure.connect
def on_task_failure(sender, task_id, exception, args, kwargs, traceback, einfo, **kw):
    try:
        from apps.monitoring.services import ErrorTrackingService

        correlation_id = correlation_id_ctx.get() or ""
        _finish_run(
            sender,
            TaskRunStatus.FAILURE,
            error_type=type(exception).__name__,
            error_message=str(exception) or "",
        )
        ErrorTrackingService.record_celery_failure(
            task_name=sender.name or "unknown",
            exception=exception,
            correlation_id=correlation_id,
        )
    except Exception:  # pragma: no cover
        logger.debug("task_failure handler failed (non-fatal)", exc_info=True)


@signals.task_retry.connect
def on_task_retried(sender, request, reason, **kw):
    try:
        _finish_run(sender, TaskRunStatus.RETRY)
    except Exception:  # pragma: no cover
        logger.debug("task_retry handler failed (non-fatal)", exc_info=True)


def _task_proxy(task_id):
    """Best-effort proxy object with request.id for callers that only have the
    task id string."""

    class _Proxy:
        class _Request:
            id = task_id

        request = _Request()
        name = ""

    return _Proxy()