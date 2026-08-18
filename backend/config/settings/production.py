"""Production settings — hardened for deployment."""
import os
from .base import *  # noqa: F403

DEBUG = False

# --- Host & Proxy Configuration ---
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",")
    if host.strip()
]
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# --- HTTPS / TLS Enforcement ---
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "True").lower() in ("true", "1")
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# --- Browser Security Headers ---
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# --- Cookie Security ---
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"

# --- CORS (no wildcards in production) ---
CORS_ALLOW_ALL_ORIGINS = False

# --- Content Security Policy ---
CONTENT_SECURITY_POLICY = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: https:; "
    "connect-src 'self' wss:; "
    "frame-ancestors 'none'"
)

# --- Logging for production (structured JSON, context-enriched, safe) ---
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_context": {
            "()": "apps.core.logging.RequestContextFilter",
        },
    },
    "formatters": {
        "json": {
            "()": "apps.core.logging.FluxiflowJsonFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "filters": ["request_context"],
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "fluxiflow": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "fluxiflow.security": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "fluxiflow.monitoring": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "fluxiflow.api": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# Optional rotating JSON file output for container/local deployments (safe retention)
if os.environ.get("FLUXIFLOW_LOG_FILE"):
    LOGGING["handlers"]["file"] = {
        "class": "logging.handlers.RotatingFileHandler",
        "filename": os.environ["FLUXIFLOW_LOG_FILE"],
        "maxBytes": 10 * 1024 * 1024,  # 10 MB per file
        "backupCount": 5,
        "formatter": "json",
        "filters": ["request_context"],
    }
    for _logger_name in LOGGING["loggers"]:
        LOGGING["loggers"][_logger_name]["handlers"] = ["console", "file"]

# --- Startup configuration validation (fail fast on critical misconfig) ---
try:
    from apps.core.startup import run_config_checks

    run_config_checks(fail_fast=False)
except Exception:  # pragma: no cover - never block boot on optional checks
    pass
