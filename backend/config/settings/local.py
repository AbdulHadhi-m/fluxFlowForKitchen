"""Local development settings."""
from .base import *  # noqa: F403

DEBUG = True

# In local development, allow console email backend
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
