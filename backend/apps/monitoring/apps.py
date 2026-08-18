from django.apps import AppConfig


class MonitoringConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.monitoring"
    verbose_name = "Monitoring & Observability"

    def ready(self):
        # Connect observability instrumentation (idempotent by Django signal framework)
        from apps.monitoring import celery_instrumentation  # noqa: F401
        from apps.monitoring import db_monitor  # noqa: F401