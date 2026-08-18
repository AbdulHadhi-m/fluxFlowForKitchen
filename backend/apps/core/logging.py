"""Structured, safe logging infrastructure.

Provides:
- ``FluxiflowJsonFormatter`` — machine-readable JSON log lines with a whitelisted
  set of context fields and secret redaction.
- ``FluxiflowTextFormatter`` — human-readable local development formatter with
  the same context injection.
- ``RequestContextFilter`` — injects correlation ID, user, restaurant, and
  environment context into every log record from the active ContextVars.

Security rules enforced here:
- Never log passwords, tokens, API keys, payment secrets, or PII.
- Secret-like values are redacted even if a developer passes them in extra.
"""
import json
import logging
import re
import time

from apps.monitoring.context import correlation_id_ctx, restaurant_id_ctx, user_id_ctx

# ---------------------------------------------------------------------------
# Secret redaction
# ---------------------------------------------------------------------------

_REDACTED = "[REDACTED]"

# JWT-style tokens (header.payload.signature), bearer tokens, and hex secrets
_SECRET_PATTERNS = [
    re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
    re.compile(r"(?i)(bearer|basic)\s+[A-Za-z0-9._~+/=-]{6,}"),
    re.compile(r"(?i)(api[_-]?key|secret|token|password|passwd|pwd|cvv|cvc|private[_-]?key)['\"]?\s*[:=]\s*['\"]?[^\s,'\"]{4,}"),
    re.compile(r"\b[0-9a-f]{64}\b"),
]

# Whitelisted extra keys that may be carried into structured log output
_SAFE_EXTRA_KEYS = {
    "correlation_id",
    "user_id",
    "restaurant_id",
    "tenant_id",
    "environment",
    "service",
    "operation",
    "duration_ms",
    "result",
    "error_code",
    "status_code",
    "method",
    "path",
    "endpoint",
    "module",
    "task_name",
    "task_id",
    "execution_id",
    "workflow_id",
    "version",
    "queue",
    "channel",
    "attempt",
    "retry_count",
    "sample_rate",
    "event",
}


def redact_text(text: str) -> str:
    """Redact secret-like values from a free-form string."""
    if not text:
        return text
    for pattern in _SECRET_PATTERNS:
        text = pattern.sub(_REDACTED, text)
    return text


def sanitize_extra(extra: dict) -> dict:
    """Keep only whitelisted, scalar, safe extra fields."""
    cleaned = {}
    for key, value in (extra or {}).items():
        if key in _SAFE_EXTRA_KEYS and isinstance(value, (str, int, float, bool)) or key in _SAFE_EXTRA_KEYS and value is None:
            cleaned[key] = redact_text(str(value)) if isinstance(value, str) else value
    return cleaned


class RequestContextFilter(logging.Filter):
    """
    Injects ambient request context (correlation ID, user, restaurant) into
    every log record, so downstream handlers are consistently enriched.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "correlation_id"):
            record.correlation_id = correlation_id_ctx.get() or ""
        if not hasattr(record, "user_id"):
            record.user_id = user_id_ctx.get() or ""
        if not hasattr(record, "restaurant_id"):
            record.restaurant_id = restaurant_id_ctx.get() or ""
        if not hasattr(record, "environment"):
            from django.conf import settings

            record.environment = getattr(settings, "ENVIRONMENT", "development")
        return True


class FluxiflowJsonFormatter(logging.Formatter):
    """
    Emits one JSON object per line:

    {"timestamp": ..., "level": ..., "logger": ..., "message": ...,
     "correlation_id": ..., "user_id": ..., "restaurant_id": ...,
     "environment": ..., "operation": ..., "duration_ms": ..., ...}
    """

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "message": redact_text(record.getMessage()),
        }
        payload.update(sanitize_extra(vars(record)))
        try:
            return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        except (TypeError, ValueError):
            payload["message"] = "[unserializable message]"
            return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


class FluxiflowTextFormatter(logging.Formatter):
    """Human-readable local formatter enriched with ambient context."""

    def format(self, record: logging.LogRecord) -> str:
        base = redact_text(super().format(record))
        parts = []
        corr = getattr(record, "correlation_id", "") or ""
        user = getattr(record, "user_id", "") or ""
        restaurant = getattr(record, "restaurant_id", "") or ""
        if corr:
            parts.append(f"corr={corr[:12]}")
        if user:
            parts.append(f"user={user[:8]}")
        if restaurant:
            parts.append(f"rest={restaurant[:8]}")
        suffix = " ".join(parts)
        return f"{base} [{suffix}]" if suffix else base