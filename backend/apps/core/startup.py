"""Startup configuration validation.

`run_config_checks()` validates required configuration without touching the
network and fails fast on critical misconfiguration (production only).
`run_connectivity_checks()` additionally verifies database/Redis/broker
connectivity — used by the `check_startup` management command for deployment
verification. Secret values are never printed.
"""
import logging
import os

from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger("fluxiflow.startup")

_REQUIRED_PRODUCTION_ENV = [
    "DJANGO_SECRET_KEY",
    "JWT_SIGNING_KEY",
    "POSTGRES_HOST",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "REDIS_URL",
    "CELERY_BROKER_URL",
]

_DEFAULT_INSECURE_SECRETS = {
    "insecure-dev-secret-key-change-in-production-fluxiflow",
    "",
}


def run_config_checks(fail_fast: bool = None) -> list:
    """
    Validate required configuration. Returns a list of (level, message) tuples.
    In production, critical problems raise ImproperlyConfigured (fail fast).
    """
    from django.conf import settings

    is_production = not settings.DEBUG
    fail_fast = settings.FLUXIFLOW_FAIL_FAST if fail_fast is None else fail_fast
    if fail_fast is None:
        fail_fast = is_production

    issues = []

    secret_key = getattr(settings, "SECRET_KEY", "")
    if secret_key in _DEFAULT_INSECURE_SECRETS:
        issues.append(("CRITICAL", "DJANGO_SECRET_KEY is missing or still the insecure development default."))

    if not getattr(settings, "JWT_SIGNING_KEY", ""):
        issues.append(("CRITICAL", "JWT_SIGNING_KEY is not configured."))

    if not getattr(settings, "MFA_ENCRYPTION_KEY", ""):
        issues.append(("WARNING", "MFA_ENCRYPTION_KEY is not configured; MFA TOTP secrets cannot be encrypted."))

    allowed_hosts = getattr(settings, "ALLOWED_HOSTS", [])
    if is_production and not allowed_hosts:
        issues.append(("CRITICAL", "DJANGO_ALLOWED_HOSTS is empty in production."))

    if is_production and not getattr(settings, "CORS_ALLOWED_ORIGINS", []):
        issues.append(("WARNING", "CORS_ALLOWED_ORIGINS is empty."))

    for env_key in _REQUIRED_PRODUCTION_ENV:
        if not os.environ.get(env_key):
            issues.append(("WARNING", f"{env_key} environment variable is not set."))

    if is_production:
        csrf = getattr(settings, "CSRF_COOKIE_SECURE", True)
        session = getattr(settings, "SESSION_COOKIE_SECURE", True)
        if not (csrf and session):
            issues.append(("CRITICAL", "Secure cookie flags are disabled in production."))

    for level, message in issues:
        if level == "CRITICAL":
            logger.critical("Startup configuration failure: %s", message)
        elif level == "WARNING":
            logger.warning("Startup configuration warning: %s", message)

    if fail_fast:
        critical = [m for lvl, m in issues if lvl == "CRITICAL"]
        if critical:
            raise ImproperlyConfigured("; ".join(critical))

    return issues


def run_connectivity_checks() -> dict:
    """Verify database, Redis, and Celery broker connectivity (deployment health)."""
    from apps.core.health import check_celery_broker, check_postgres, check_redis

    results = {
        "postgres": check_postgres(),
        "redis": check_redis(),
        "celery_broker": check_celery_broker(),
    }
    summary = {}
    for key, result in results.items():
        summary[key] = result["status"]
        if result["status"] != "HEALTHY":
            logger.error("Connectivity check failed for %s: %s", key, result.get("error", ""))
    return {"status": "ok" if all(s == "HEALTHY" for s in summary.values()) else "failed", "checks": summary}