"""Base settings for Fluxiflow for Kitchen."""
import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from backend/.env
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "insecure-dev-secret-key-change-in-production-fluxiflow")
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")

# Separate JWT signing key — falls back to SECRET_KEY if not configured
JWT_SIGNING_KEY = os.environ.get("JWT_SIGNING_KEY", SECRET_KEY)

# MFA encryption key for TOTP secrets
MFA_ENCRYPTION_KEY = os.environ.get("MFA_ENCRYPTION_KEY", "")

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend,0.0.0.0").split(",")
    if host.strip()
]

# Custom User Model
AUTH_USER_MODEL = "accounts.User"

# Application definition
DJANGO_APPS = [
    "daphne",  # ASGI server must be first
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "channels",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.core",
    "apps.accounts",
    "apps.rbac",
    "apps.restaurants",
    "apps.staff",
    "apps.menu",
    "apps.tenancy",
    "apps.facilities",
    "apps.catalog",
    "apps.tables",
    "apps.orders",
    "apps.kitchen",
    "apps.billing",
    "apps.inventory",
    "apps.procurement",
    "apps.reports",
    "apps.settings",
    "apps.audit",
    "apps.notifications",
    "apps.customers",
    "apps.loyalty",
    "apps.marketing",
    "apps.ordering",
    "apps.delivery",
    "apps.finance",
    "apps.hr",
    "apps.workflows",
    "apps.security",
    "apps.monitoring",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "apps.core.middleware.CorrelationIDMiddleware",  # Correlation ID first
    "apps.security.middleware.SecurityHeadersMiddleware",  # Security headers early
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.security.middleware.SecureTenantContextMiddleware",  # After auth, validates tenant
    "apps.monitoring.middleware.RequestMetricsMiddleware",  # Metrics, latency samples, request logs
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database Configuration
POSTGRES_DB = os.environ.get("POSTGRES_DB", "fluxiflow_db")
POSTGRES_USER = os.environ.get("POSTGRES_USER", "fluxiflow_user")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "fluxiflow_password")
POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "5432")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": POSTGRES_DB,
        "USER": POSTGRES_USER,
        "PASSWORD": POSTGRES_PASSWORD,
        "HOST": POSTGRES_HOST,
        "PORT": POSTGRES_PORT,
        "CONN_MAX_AGE": 60,
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.accounts.authentication.SessionValidatingJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.FluxiflowPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": (
        "apps.core.throttling.BurstUserThrottle",
        "apps.core.throttling.SustainedUserThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "auth_public": "60/minute",
        "user_burst": "120/minute",
        "user_sustained": "2000/hour",
    },
}

# SimpleJWT Settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SIGNING_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# OpenAPI / Spectacular settings
SPECTACULAR_SETTINGS = {
    "TITLE": "Fluxiflow for Kitchen API",
    "DESCRIPTION": "Production-grade Restaurant Operations Management System API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# Channels Channel Layer (Redis)
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}

# Celery Configuration
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/1")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# Structured Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_context": {
            "()": "apps.core.logging.RequestContextFilter",
        },
    },
    "formatters": {
        "standard": {
            "()": "apps.core.logging.FluxiflowTextFormatter",
            "format": "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
            "filters": ["request_context"],
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "fluxiflow": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# Celery Beat Schedule (Workflow Automation jobs)
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    "workflows-process-scheduled": {
        "task": "apps.workflows.tasks.process_scheduled_workflows",
        "schedule": 60.0,
        "options": {"expires": 90},
    },
    "workflows-resume-waiting": {
        "task": "apps.workflows.tasks.process_waiting_executions",
        "schedule": 60.0,
        "options": {"expires": 90},
    },
    "workflows-approval-deadlines": {
        "task": "apps.workflows.tasks.process_approval_deadlines",
        "schedule": 300.0,
        "options": {"expires": 360},
    },
    "workflows-low-stock-scan": {
        "task": "apps.workflows.tasks.detect_low_stock_events",
        "schedule": crontab(minute="*/15"),
        "options": {"expires": 600},
    },
    "workflows-overdue-invoices-scan": {
        "task": "apps.workflows.tasks.detect_overdue_invoices",
        "schedule": crontab(minute="0", hour="*"),
        "options": {"expires": 1800},
    },
    # Security tasks
    "security-suspicious-activity-scan": {
        "task": "security.detect_suspicious_activity",
        "schedule": 300.0,  # Every 5 minutes
        "options": {"expires": 360},
    },
    "security-data-retention": {
        "task": "security.enforce_data_retention",
        "schedule": crontab(minute="0", hour="3"),  # Daily at 3 AM
        "options": {"expires": 3600},
    },
    "security-session-cleanup": {
        "task": "security.cleanup_expired_sessions",
        "schedule": crontab(minute="0", hour="4"),  # Daily at 4 AM
        "options": {"expires": 3600},
    },
    "security-login-attempt-cleanup": {
        "task": "security.cleanup_login_attempts",
        "schedule": crontab(minute="0", hour="5"),  # Daily at 5 AM
        "options": {"expires": 3600},
    },
    # Monitoring & observability
    "monitoring-evaluate-alerts": {
        "task": "monitoring.evaluate_alerts",
        "schedule": 60.0,  # Every minute
        "options": {"expires": 90},
    },
    "monitoring-detect-stuck-tasks": {
        "task": "monitoring.detect_stuck_tasks",
        "schedule": 300.0,  # Every 5 minutes
        "options": {"expires": 360},
    },
    "monitoring-evaluate-slos": {
        "task": "monitoring.evaluate_slos",
        "schedule": 3600.0,  # Hourly
        "options": {"expires": 1800},
    },
    "monitoring-cleanup": {
        "task": "monitoring.cleanup_monitoring_data",
        "schedule": crontab(minute="0", hour="2"),  # Daily at 2 AM
        "options": {"expires": 3600},
    },
}

# Workflow webhook credential references (secrets resolved at runtime; never stored in DB)
FLUXIFLOW_WEBHOOK_CREDENTIALS = {}

# ---------------------------------------------------------------------------
# Monitoring & Observability
# ---------------------------------------------------------------------------
ENVIRONMENT = os.environ.get("FLUXIFLOW_ENVIRONMENT", "development")

APP_BUILD_INFO = {
    "version": os.environ.get("FLUXIFLOW_VERSION", "dev"),
    "commit_sha": os.environ.get("FLUXIFLOW_COMMIT_SHA", "unknown")[:12],
    "build_timestamp": os.environ.get("FLUXIFLOW_BUILD_TIMESTAMP", ""),
    "environment": ENVIRONMENT,
}

# Master switches for the observability layer
MONITORING_ENABLED = os.environ.get("FLUXIFLOW_MONITORING_ENABLED", "True").lower() in ("true", "1", "yes")
MONITORING_METRICS_ENABLED = True
MONITORING_REQUEST_LOGGING = True
MONITORING_LATENCY_SAMPLE_RATE = float(os.environ.get("FLUXIFLOW_LATENCY_SAMPLE_RATE", "0.1"))
MONITORING_SLOW_QUERY_THRESHOLD_MS = int(os.environ.get("FLUXIFLOW_SLOW_QUERY_THRESHOLD_MS", "500"))
MONITORING_STUCK_TASK_THRESHOLD_MINUTES = int(
    os.environ.get("FLUXIFLOW_STUCK_TASK_THRESHOLD_MINUTES", "15")
)

# Critical dependencies gate the readiness endpoint
MONITORING_CRITICAL_DEPENDENCIES = {
    "postgres": True,
    "redis": False,
}

# Fail fast on critical configuration problems (production only)
FLUXIFLOW_FAIL_FAST = os.environ.get("FLUXIFLOW_FAIL_FAST", "").lower() in ("true", "1", "yes")

# Optional JSON log file output (container/local deployments). Path empty = console only.
MONITORING_LOG_FILE = os.environ.get("FLUXIFLOW_LOG_FILE", "")
