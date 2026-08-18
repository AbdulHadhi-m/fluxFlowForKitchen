"""Core observability services: metrics recording, error aggregation, external
call tracking, notification delivery tracking, and retention cleanup.

Every public entry point is fail-safe: observability must never break or slow
down core restaurant operations (section 122 — monitoring failure safety).
"""
import hashlib
import logging
import random
import re
import threading
from datetime import timedelta

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from apps.monitoring.constants import (
    DeliveryChannel,
    DeliveryStatus,
    ErrorModule,
    ErrorSeverity,
    ErrorStatus,
    ExternalCallStatus,
)
from apps.monitoring.models import (
    CeleryTaskRun,
    ErrorEvent,
    ExternalServiceMetric,
    MonitoringConfig,
    NotificationDeliveryMetric,
    RequestLatencySample,
    RequestMetric,
    SlowQueryLog,
    WebhookDelivery,
)

logger = logging.getLogger("fluxiflow.monitoring")

_UUID_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE)
_INT_RE = re.compile(r"/\d+(?=/|$)")
_WS_RE = re.compile(r"\s+")

_EXCLUDED_PREFIXES = (
    "/api/v1/monitoring/",
    "/api/v1/health/",
    "/admin/",
    "/static/",
    "/media/",
    "/api/schema",
    "/api/docs",
)

SENSITIVE_KEYS = {
    "password", "password_hash", "access_token", "refresh_token", "token", "secret",
    "api_key", "apikey", "card_number", "cvv", "cvc", "pin", "authorization",
    "bank_account", "private_key", "jwt", "mfa_secret", "webhook_secret",
}


def normalize_path(path: str) -> str:
    """Normalize a raw URL path into a low-cardinality route template."""
    normalized = _UUID_RE.sub("{uuid}", path or "")
    normalized = _INT_RE.sub("/{id}", normalized)
    return normalized[:255]


def sanitize_metadata(data) -> dict:
    """Recursively redact secret-like keys from arbitrary context dictionaries."""
    if isinstance(data, dict):
        cleaned = {}
        for key, value in data.items():
            lower = str(key).lower()
            if any(s in lower for s in SENSITIVE_KEYS):
                cleaned[key] = "[REDACTED]"
            elif isinstance(value, (dict, list)):
                cleaned[key] = sanitize_metadata(value)
            else:
                cleaned[key] = str(value)[:500] if not isinstance(value, (int, float, bool)) else value
        return cleaned
    if isinstance(data, list):
        return [sanitize_metadata(item) for item in data]
    return {"value": str(data)[:500]}


def normalize_query_signature(sql: str) -> str:
    """Strip literals/values from SQL for aggregation (privacy by design)."""
    if not sql:
        return ""
    s = re.sub(r"'[^']*'", "?", sql)
    s = re.sub(r'"[^"]*"', "?", s)
    s = re.sub(r"\b\d+\b", "?", s)
    s = _WS_RE.sub(" ", s).strip()
    return s[:500]


def fingerprint_error(error_type: str, message: str, module: str, endpoint: str = "") -> str:
    """Deterministic fingerprint grouping similar errors (section 15)."""
    normalized_message = _WS_RE.sub(" ", message or "").lower()
    normalized_message = _UUID_RE.sub("{uuid}", normalized_message)
    normalized_message = re.sub(r"\b\d+\b", "{n}", normalized_message)
    raw = "|".join([
        (error_type or "").lower(),
        normalized_message[:300],
        (module or "").lower(),
        normalize_path(endpoint or ""),
    ])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class ConfigService:
    """Runtime monitoring configuration access with in-process caching."""

    _cache = {"config": None, "loaded_at": None}
    _lock = threading.Lock()

    @classmethod
    def get(cls) -> MonitoringConfig:
        with cls._lock:
            now = timezone.now()
            if (
                cls._cache["config"] is None
                or cls._cache["loaded_at"] is None
                or (now - cls._cache["loaded_at"]).total_seconds() > 60
            ):
                cls._cache["config"] = MonitoringConfig.load()
                cls._cache["loaded_at"] = now
            return cls._cache["config"]

    @classmethod
    def invalidate(cls):
        with cls._lock:
            cls._cache["config"] = None
            cls._cache["loaded_at"] = None


class MetricsService:
    """Records low-cardinality request metrics and latency samples."""

    _bucket_cache = {}
    _bucket_lock = threading.Lock()
    _bucket_cache_max = 8192

    @classmethod
    def get_config(cls) -> MonitoringConfig:
        return ConfigService.get()

    @classmethod
    def is_excluded(cls, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in _EXCLUDED_PREFIXES)

    @classmethod
    def record_request(cls, method: str, path: str, status_code: int, duration_ms: int) -> None:
        """Record one request into the minute bucket + optional latency sample.

        Never raises: observability failures must not affect the request path.
        """
        if not getattr(settings, "MONITORING_ENABLED", True):
            return
        if cls.is_excluded(path):
            return
        try:
            config = cls.get_config()
            if not config.metrics_enabled:
                return

            endpoint = normalize_path(path)
            status_class = f"{status_code // 100}xx" if status_code else "0xx"
            bucket = timezone.now().replace(second=0, microsecond=0)
            key = f"{bucket.isoformat()}|{method}|{endpoint}|{status_class}"

            row = cls._get_bucket_row(key, bucket, method, endpoint, status_class)
            if row is None:
                return

            update_fields = {
                "count": models.F("count") + 1,
                "total_duration_ms": models.F("total_duration_ms") + duration_ms,
            }
            RequestMetric.objects.filter(pk=row.pk).update(**update_fields)
            if status_class == "5xx":
                RequestMetric.objects.filter(pk=row.pk).update(error_count=models.F("error_count") + 1)

            # Max duration (best-effort; stale reads across workers are acceptable)
            if duration_ms > row.max_duration_ms:
                RequestMetric.objects.filter(pk=row.pk).update(max_duration_ms=duration_ms)

            # Latency percentile sampling
            if config.latency_sample_rate > 0 and random.random() < config.latency_sample_rate:
                RequestLatencySample.objects.create(
                    sampled_at=timezone.now(),
                    endpoint=endpoint,
                    method=method,
                    status_class=status_class,
                    duration_ms=duration_ms,
                )
        except Exception:  # pragma: no cover
            logger.debug("Request metric recording skipped (non-fatal)", exc_info=True)

    @classmethod
    def _get_bucket_row(cls, key, bucket, method, endpoint, status_class):
        with cls._bucket_lock:
            row_id = cls._bucket_cache.get(key)
            if len(cls._bucket_cache) > cls._bucket_cache_max:
                cls._bucket_cache.clear()

        if row_id is not None:
            try:
                return RequestMetric.objects.get(pk=row_id)
            except RequestMetric.DoesNotExist:
                pass

        try:
            row, _ = RequestMetric.objects.get_or_create(
                bucket_minute=bucket,
                method=method,
                endpoint=endpoint,
                status_class=status_class,
                defaults={
                    "count": 0,
                    "error_count": 0,
                    "total_duration_ms": 0,
                    "max_duration_ms": 0,
                },
            )
            with cls._bucket_lock:
                cls._bucket_cache[key] = row.pk
            return row
        except Exception:  # pragma: no cover
            return None

    @classmethod
    def record_unhandled_exception(cls, request, exception) -> None:
        """Last-resort capture for exceptions escaping the view layer."""
        from apps.monitoring.services import ErrorTrackingService

        try:
            ErrorTrackingService.record_exception(exception, request)
        except Exception:  # pragma: no cover
            logger.debug("Exception capture skipped (non-fatal)", exc_info=True)


class ErrorTrackingService:
    """Fingerprint-grouped error aggregation (sections 14-16)."""

    @classmethod
    def record(
        cls,
        error_type: str,
        message: str,
        module: str = ErrorModule.API,
        endpoint: str = "",
        severity: str = ErrorSeverity.MEDIUM,
        stack_trace: str = "",
        restaurant=None,
        user=None,
        correlation_id: str = "",
        metadata: dict = None,
        version: str = "",
        environment: str = "",
    ) -> ErrorEvent:
        """Aggregate an error into its fingerprint group (idempotent grouping)."""
        from apps.core.logging import redact_text

        safe_message = redact_text(message or "")[:2000]
        fingerprint = fingerprint_error(error_type, safe_message, module, endpoint)
        environment = environment or getattr(settings, "ENVIRONMENT", "development")
        version = version or getattr(settings, "APP_BUILD_INFO", {}).get("version", "dev")

        try:
            with transaction.atomic():
                event, created = ErrorEvent.objects.select_for_update().get_or_create(
                    fingerprint=fingerprint,
                    environment=environment,
                    defaults={
                        "error_type": (error_type or "UNKNOWN")[:255],
                        "message": safe_message or "Unknown error",
                        "stack_trace": (stack_trace or "")[:10000],
                        "module": module,
                        "endpoint": normalize_path(endpoint),
                        "severity": severity,
                        "status": ErrorStatus.NEW,
                        "count": 1,
                        "first_seen": timezone.now(),
                        "last_seen": timezone.now(),
                        "version": version,
                        "restaurant": restaurant,
                        "user": user,
                        "correlation_id": correlation_id or "",
                        "metadata": sanitize_metadata(metadata or {}),
                    },
                )
                if not created:
                    ErrorEvent.objects.filter(pk=event.pk).update(
                        count=models.F("count") + 1,
                        last_seen=timezone.now(),
                        severity=severity,
                        version=version,
                    )
                    event.count += 1
                    event.last_seen = timezone.now()
                return event
        except Exception:  # pragma: no cover
            logger.debug("Error event recording skipped (non-fatal)", exc_info=True)
            return None

    @classmethod
    def record_exception(cls, exception, request=None, module: str = ErrorModule.API) -> ErrorEvent:
        """Record a raised exception with safe request context (no bodies logged)."""
        exc_type = type(exception).__name__
        message = str(exception) or exc_type
        restaurant = getattr(request, "restaurant", None) if request else None
        user = getattr(request, "user", None) if request and getattr(request, "user", None).is_authenticated else None
        correlation_id = getattr(request, "correlation_id", "") if request else ""
        return cls.record(
            error_type=exc_type,
            message=message,
            module=module,
            endpoint=getattr(request, "path", "") if request else "",
            severity=ErrorSeverity.MEDIUM,
            restaurant=restaurant,
            user=user,
            correlation_id=correlation_id,
            metadata={"method": getattr(request, "method", "")} if request else {},
        )

    @classmethod
    def record_celery_failure(cls, task_name: str, exception, correlation_id: str = "") -> ErrorEvent:
        return cls.record(
            error_type=type(exception).__name__,
            message=str(exception) or type(exception).__name__,
            module=ErrorModule.CELERY,
            endpoint="",
            severity=ErrorSeverity.MEDIUM,
            restaurant=None,
            user=None,
            correlation_id=correlation_id,
            metadata={"task_name": task_name},
        )

    @classmethod
    def record_frontend(
        cls,
        message: str,
        stack: str = "",
        url: str = "",
        component: str = "",
        endpoint: str = "",
        method: str = "",
        status_code: int = None,
        severity: str = ErrorSeverity.MEDIUM,
        user=None,
        restaurant=None,
        correlation_id: str = "",
    ) -> ErrorEvent:
        """Record a sanitized frontend-reported error (whitelist-only payload)."""
        return cls.record(
            error_type="FrontendError",
            message=message,
            module=ErrorModule.FRONTEND,
            endpoint=endpoint,
            severity=severity,
            stack_trace=stack,
            restaurant=restaurant,
            user=user,
            correlation_id=correlation_id,
            metadata={
                "url": (url or "")[:500],
                "component": (component or "")[:100],
                "method": (method or "")[:10],
                "status_code": status_code,
            },
        )

    @classmethod
    def update_status(cls, event: ErrorEvent, new_status: str, user=None) -> ErrorEvent:
        """Transition error status with audit trail."""
        from apps.audit.services import AuditLogService

        valid = {s for s, _ in ErrorStatus.choices}
        if new_status not in valid:
            raise ValueError(f"Invalid error status: {new_status}")

        event.status = new_status
        event.save(update_fields=["status", "updated_at"])
        try:
            AuditLogService.record(
                action="STATUS_CHANGED",
                entity_type="ERROR_EVENT",
                entity_id=str(event.id),
                description=f"Error event status changed to {new_status}",
                restaurant=event.restaurant,
                actor_user=user,
                metadata={"from_status": "previous", "to_status": new_status},
            )
        except Exception:
            logger.debug("Audit record for error status change skipped", exc_info=True)
        return event


class ExternalCallRecorder:
    """Tracks external integration calls for the integrations dashboard."""

    @classmethod
    def record(
        cls,
        service: str,
        status: str = ExternalCallStatus.SUCCESS,
        duration_ms: int = None,
        error_code: str = "",
    ) -> None:
        try:
            ExternalServiceMetric.objects.create(
                service=service,
                status=status,
                duration_ms=duration_ms,
                error_code=error_code[:100],
            )
        except Exception:  # pragma: no cover
            logger.debug("External call metric skipped (non-fatal)", exc_info=True)


class NotificationDeliveryRecorder:
    """Tracks delivery attempts of the existing notification system (no new
    notification system — only measurement)."""

    @classmethod
    def record(
        cls,
        channel: str = DeliveryChannel.IN_APP,
        status: str = DeliveryStatus.SENT,
        notification_type: str = "",
        duration_ms: int = None,
        error_code: str = "",
    ) -> None:
        try:
            NotificationDeliveryMetric.objects.create(
                channel=channel,
                status=status,
                notification_type=(notification_type or "")[:50],
                duration_ms=duration_ms,
                error_code=(error_code or "")[:100],
            )
        except Exception:  # pragma: no cover
            logger.debug("Notification delivery metric skipped (non-fatal)", exc_info=True)


class RetentionService:
    """Scheduled cleanup of monitoring data according to configured retention."""

    MODELS = {
        "request_metrics": (RequestMetric, "bucket_minute"),
        "latency_samples": (RequestLatencySample, "sampled_at"),
        "error_events": (ErrorEvent, "last_seen"),
        "slow_queries": (SlowQueryLog, "last_seen"),
        "celery_task_runs": (CeleryTaskRun, "started_at"),
        "notification_deliveries": (NotificationDeliveryMetric, "created_at"),
        "webhook_deliveries": (WebhookDelivery, "created_at"),
        "external_metrics": (ExternalServiceMetric, "created_at"),
    }

    @classmethod
    def cleanup(cls) -> dict:
        """Delete expired monitoring rows. Returns {category: deleted_count}."""
        config = ConfigService.get()
        results = {}
        now = timezone.now()
        for category, (model, field) in cls.MODELS.items():
            retention_days = config.get_retention_days(category)
            try:
                cutoff = now - timedelta(days=retention_days)
                deleted, _ = model.objects.filter(**{f"{field}__lt": cutoff}).delete()
                results[category] = deleted
            except Exception:  # pragma: no cover
                logger.error("Retention cleanup failed for %s", category, exc_info=True)
                results[category] = 0

        # Resolved alerts / incidents beyond retention
        try:
            from apps.monitoring.models import Alert, MonitoringIncident

            cutoff = now - timedelta(days=config.get_retention_days("alerts"))
            results["alerts"] = Alert.objects.filter(status="RESOLVED", resolved_at__lt=cutoff).count()
            results["incidents"] = MonitoringIncident.objects.filter(
                status__in=["RESOLVED", "CLOSED"], resolved_at__lt=cutoff
            ).count()
        except Exception:  # pragma: no cover
            logger.error("Alert/incident retention cleanup failed", exc_info=True)
        return results