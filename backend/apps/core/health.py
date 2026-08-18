"""Dependency health checks with graceful-degradation classification.

Critical dependencies (PostgreSQL, authentication-required stores) gate the
readiness endpoint. Non-critical dependencies (Celery worker, analytics) report
degraded status without blocking traffic.
"""
import logging
import time

from django.conf import settings
from django.db import connection

import redis

logger = logging.getLogger("fluxiflow.health")

HEALTHY = "HEALTHY"
DEGRADED = "DEGRADED"
UNHEALTHY = "UNHEALTHY"

_CRITICAL_DEFAULT = {"postgres": True, "redis": False}


def _is_critical(dependency: str) -> bool:
    configured = getattr(settings, "MONITORING_CRITICAL_DEPENDENCIES", None)
    if configured:
        return bool(configured.get(dependency, False))
    return _CRITICAL_DEFAULT.get(dependency, False)


def check_postgres(timeout_ms: int = 1500) -> dict:
    started = time.monotonic()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
        duration = int((time.monotonic() - started) * 1000)
        return {"status": HEALTHY, "latency_ms": duration, "error": ""}
    except Exception as exc:  # pragma: no cover - depends on DB availability
        duration = int((time.monotonic() - started) * 1000)
        logger.error("PostgreSQL health check failed: %s", type(exc).__name__)
        return {"status": UNHEALTHY, "latency_ms": duration, "error": type(exc).__name__}


def check_redis(timeout_ms: int = 1500) -> dict:
    started = time.monotonic()
    try:
        client = redis.from_url(settings.REDIS_URL, socket_connect_timeout=timeout_ms / 1000)
        client.ping()
        client.close()
        duration = int((time.monotonic() - started) * 1000)
        return {"status": HEALTHY, "latency_ms": duration, "error": ""}
    except Exception as exc:  # pragma: no cover - depends on Redis availability
        duration = int((time.monotonic() - started) * 1000)
        logger.error("Redis health check failed: %s", type(exc).__name__)
        return {"status": UNHEALTHY, "latency_ms": duration, "error": type(exc).__name__}


def check_celery_broker(timeout_ms: int = 1500) -> dict:
    """Celery broker liveness via the same Redis broker (non-critical)."""
    started = time.monotonic()
    try:
        client = redis.from_url(settings.CELERY_BROKER_URL, socket_connect_timeout=timeout_ms / 1000)
        client.ping()
        client.close()
        duration = int((time.monotonic() - started) * 1000)
        return {"status": HEALTHY, "latency_ms": duration, "error": ""}
    except Exception as exc:  # pragma: no cover
        duration = int((time.monotonic() - started) * 1000)
        return {"status": UNHEALTHY, "latency_ms": duration, "error": type(exc).__name__}


def check_celery_worker(timeout_ms: int = 2000) -> dict:
    """Worker availability via control ping. Failures never raise."""
    try:
        from config.celery import app as celery_app

        started = time.monotonic()
        try:
            ping = celery_app.control.ping(timeout=timeout_ms / 1000)
        except Exception:
            ping = None
        duration = int((time.monotonic() - started) * 1000)
        worker_count = len(ping or [])
        if worker_count > 0:
            return {"status": HEALTHY, "latency_ms": duration, "error": "", "workers": worker_count}
        return {"status": DEGRADED, "latency_ms": duration, "error": "no_workers", "workers": 0}
    except Exception as exc:  # pragma: no cover
        return {"status": UNHEALTHY, "latency_ms": 0, "error": type(exc).__name__, "workers": 0}


class HealthService:
    """Runs dependency checks and classifies overall health status."""

    @classmethod
    def run_all(cls) -> dict:
        checks = {
            "postgres": check_postgres(),
            "redis": check_redis(),
            "celery_broker": check_celery_broker(),
            "celery_worker": check_celery_worker(),
        }
        dependencies = {}
        for key, result in checks.items():
            dependencies[key] = {
                "status": result["status"],
                "latency_ms": result["latency_ms"],
                "critical": _is_critical(key),
            }
            if "workers" in result:
                dependencies[key]["workers"] = result["workers"]

        unhealthy_critical = any(
            dep["status"] == UNHEALTHY and dep["critical"] for dep in dependencies.values()
        )
        any_unhealthy = any(dep["status"] != HEALTHY for dep in dependencies.values())

        if unhealthy_critical:
            overall = UNHEALTHY
        elif any_unhealthy:
            overall = DEGRADED
        else:
            overall = HEALTHY

        return {
            "status": overall,
            "dependencies": dependencies,
        }

    @classmethod
    def readiness(cls) -> dict:
        """Readiness: can this instance safely receive traffic?

        Ready when no critical dependency is unhealthy. Non-critical
        degradations (e.g. no Celery worker) do not block traffic.
        """
        result = cls.run_all()
        critical_unhealthy = any(
            dep["status"] == UNHEALTHY and dep["critical"]
            for dep in result["dependencies"].values()
        )
        return {
            "ready": not critical_unhealthy,
            "status": result["status"],
            "dependencies": result["dependencies"],
        }

    @classmethod
    def liveness(cls) -> dict:
        """Liveness: is this application process alive?"""
        return {"status": HEALTHY}

    @classmethod
    def dependency_summary(cls) -> dict:
        """Full dependency detail for /health/dependencies/ (safe metadata only)."""
        return cls.run_all()