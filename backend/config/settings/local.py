"""Local development settings."""
import os
from .base import *  # noqa: F403

DEBUG = True

# In local development, allow console email backend
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Standalone local database (SQLite) if PostgreSQL is not explicitly enforced
USE_POSTGRES = os.environ.get("USE_POSTGRES", "False").lower() in ("true", "1", "yes")

if not USE_POSTGRES:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            "OPTIONS": {
                "timeout": 20,
            },
        }
    }

# In-memory channel layer for local WebSocket support without Redis
USE_REDIS = os.environ.get("USE_REDIS", "False").lower() in ("true", "1", "yes")
if not USE_REDIS:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "fluxiflow-local-dev-cache",
        }
    }

