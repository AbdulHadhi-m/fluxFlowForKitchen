"""Request observability middleware: metrics, latency samples, and structured
request logs with ambient user/restaurant context.

The middleware is fully fail-safe: any monitoring failure is swallowed so the
core restaurant application continues operating regardless of observability
health.
"""
import logging
import time

from django.utils.deprecation import MiddlewareMixin

from apps.monitoring.context import restaurant_id_ctx, user_id_ctx
from apps.monitoring.services import MetricsService

logger = logging.getLogger("fluxiflow.monitoring")


class RequestMetricsMiddleware(MiddlewareMixin):
    """Times every request, records metrics/latency samples, and writes one
    structured request-completion log line with correlation context."""

    def process_request(self, request):
        request._monitoring_started = time.monotonic()
        # Ambient context for log enrichment
        if hasattr(request, "user") and request.user.is_authenticated:
            user_id_ctx.set(str(request.user.id))
        else:
            user_id_ctx.set("")
        restaurant_id_ctx.set(str(request.tenant_id) if getattr(request, "tenant_id", None) else "")

    def process_response(self, request, response):
        try:
            started = getattr(request, "_monitoring_started", None)
            if started is None:
                return response

            duration_ms = int((time.monotonic() - started) * 1000)
            method = request.method or ""
            path = request.path or ""
            status_code = getattr(response, "status_code", 0)

            config = MetricsService.get_config()
            if config.request_logging_enabled:
                logger.info(
                    "request.completed",
                    extra={
                        "operation": "request",
                        "method": method,
                        "path": path[:255],
                        "status_code": status_code,
                        "duration_ms": duration_ms,
                        "result": "ok" if status_code < 400 else ("client_error" if status_code < 500 else "server_error"),
                    },
                )

            if config.metrics_enabled:
                MetricsService.record_request(
                    method=method,
                    path=path,
                    status_code=status_code,
                    duration_ms=duration_ms,
                )
        except Exception:  # pragma: no cover - observability must never break requests
            logger.debug("Request metrics recording skipped (non-fatal)", exc_info=True)
        return response

    def process_exception(self, request, exception):
        """Last-resort capture for exceptions escaping the view layer."""
        try:
            MetricsService.record_unhandled_exception(request, exception)
        except Exception:  # pragma: no cover
            logger.debug("Exception capture skipped (non-fatal)", exc_info=True)
        return None