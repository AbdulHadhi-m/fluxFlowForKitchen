"""Shared constants for the monitoring & observability domain."""

from django.db import models


class ErrorSeverity(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical"


class ErrorStatus(models.TextChoices):
    NEW = "NEW", "New"
    ACKNOWLEDGED = "ACKNOWLEDGED", "Acknowledged"
    INVESTIGATING = "INVESTIGATING", "Investigating"
    RESOLVED = "RESOLVED", "Resolved"
    IGNORED = "IGNORED", "Ignored"


class ErrorModule(models.TextChoices):
    API = "api", "API"
    CELERY = "celery", "Celery Task"
    WORKFLOW = "workflow", "Workflow Engine"
    DATABASE = "database", "Database"
    NOTIFICATION = "notification", "Notification"
    WEBHOOK = "webhook", "Webhook"
    INTEGRATION = "integration", "External Integration"
    FRONTEND = "frontend", "Frontend UI"
    SECURITY = "security", "Security"
    OTHER = "other", "Other"


class TaskRunStatus(models.TextChoices):
    RUNNING = "RUNNING", "Running"
    SUCCESS = "SUCCESS", "Success"
    FAILURE = "FAILURE", "Failure"
    RETRY = "RETRY", "Retry Scheduled"
    REVOKED = "REVOKED", "Revoked"
    STUCK = "STUCK", "Stuck / Timed Out"


class DeliveryChannel(models.TextChoices):
    IN_APP = "IN_APP", "In-App"
    REALTIME = "REALTIME", "Realtime WebSocket"
    EMAIL = "EMAIL", "Email"
    SMS = "SMS", "SMS"
    PUSH = "PUSH", "Push"


class DeliveryStatus(models.TextChoices):
    SENT = "SENT", "Sent"
    FAILED = "FAILED", "Failed"
    RETRY = "RETRY", "Retrying"
    SKIPPED = "SKIPPED", "Skipped"


class ExternalService(models.TextChoices):
    PAYMENT = "PAYMENT", "Payment Provider"
    EMAIL = "EMAIL", "Email Provider"
    SMS = "SMS", "SMS Provider"
    MAPS = "MAPS", "Maps / Geocoding"
    WEBHOOK = "WEBHOOK", "Webhook Endpoint"
    DELIVERY = "DELIVERY", "Delivery Partner"
    OTHER = "OTHER", "Other Integration"


class ExternalCallStatus(models.TextChoices):
    SUCCESS = "SUCCESS", "Success"
    FAILURE = "FAILURE", "Failure"
    TIMEOUT = "TIMEOUT", "Timeout"
    RATE_LIMITED = "RATE_LIMITED", "Rate Limited"
    RETRY = "RETRY", "Retrying"


class AlertSeverity(models.TextChoices):
    INFO = "INFO", "Info"
    WARNING = "WARNING", "Warning"
    CRITICAL = "CRITICAL", "Critical"


class AlertStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    ACKNOWLEDGED = "ACKNOWLEDGED", "Acknowledged"
    RESOLVED = "RESOLVED", "Resolved"


class MonitoringService(models.TextChoices):
    API = "API", "API"
    DATABASE = "DB", "Database"
    REDIS = "REDIS", "Redis"
    CELERY = "CELERY", "Celery"
    WORKFLOW = "WORKFLOW", "Workflow Engine"
    NOTIFICATION = "NOTIFICATION", "Notifications"
    WEBHOOK = "WEBHOOK", "Webhooks"
    WEBSOCKET = "WEBSOCKET", "WebSockets"
    INTEGRATION = "INTEGRATION", "External Integrations"
    ERROR = "ERROR", "Error Tracking"
    FRONTEND = "FRONTEND", "Frontend"
    INFRA = "INFRA", "Infrastructure"


class IncidentStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    INVESTIGATING = "INVESTIGATING", "Investigating"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"


class IncidentTimelineType(models.TextChoices):
    DETECTED = "DETECTED", "Detected"
    ACKNOWLEDGED = "ACKNOWLEDGED", "Acknowledged"
    ACTION = "ACTION", "Action"
    COMMENT = "COMMENT", "Comment"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"


class SLOService(models.TextChoices):
    API = "API", "API"
    WORKFLOW = "WORKFLOW", "Workflow Engine"
    NOTIFICATION = "NOTIFICATION", "Notifications"
    WEBHOOK = "WEBHOOK", "Webhooks"
    INTEGRATION = "INTEGRATION", "External Integrations"
    ORDER = "ORDER", "Order Processing"


class SLOType(models.TextChoices):
    AVAILABILITY = "AVAILABILITY", "Availability"
    LATENCY = "LATENCY", "Latency"
    SUCCESS_RATE = "SUCCESS_RATE", "Success Rate"
    ERROR_RATE = "ERROR_RATE", "Error Rate"


# Default retention (days) per monitoring data category. Overridable at runtime
# through the MonitoringConfig singleton (monitoring.manage permission).
DEFAULT_RETENTION_DAYS = {
    "request_metrics": 30,
    "latency_samples": 14,
    "error_events": 90,
    "slow_queries": 30,
    "celery_task_runs": 30,
    "notification_deliveries": 30,
    "webhook_deliveries": 60,
    "external_metrics": 30,
    "alerts": 180,
    "incidents": 365,
}

# Default alert rules seeded on fresh installations (idempotent data migration).
DEFAULT_ALERT_RULES = [
    {
        "code": "api_error_rate_high",
        "name": "High API Error Rate",
        "service": "API",
        "metric_type": "api_error_rate",
        "operator": "GT",
        "threshold": 5.0,
        "window_minutes": 5,
        "severity": "WARNING",
        "cooldown_minutes": 30,
        "create_incident": False,
        "description": "API 5xx error rate exceeds 5% over the last 5 minutes.",
    },
    {
        "code": "api_5xx_spike",
        "name": "API 5xx Spike",
        "service": "API",
        "metric_type": "api_5xx_count",
        "operator": "GT",
        "threshold": 10.0,
        "window_minutes": 5,
        "severity": "CRITICAL",
        "cooldown_minutes": 15,
        "create_incident": True,
        "description": "More than 10 server errors in 5 minutes.",
    },
    {
        "code": "api_latency_p95_high",
        "name": "High API Latency (P95)",
        "service": "API",
        "metric_type": "api_p95_latency",
        "operator": "GT",
        "threshold": 3000.0,
        "window_minutes": 5,
        "severity": "WARNING",
        "cooldown_minutes": 30,
        "create_incident": False,
        "description": "API P95 latency exceeds 3000ms.",
    },
    {
        "code": "database_unhealthy",
        "name": "Database Unavailable",
        "service": "DB",
        "metric_type": "db_healthy",
        "operator": "LT",
        "threshold": 1.0,
        "window_minutes": 1,
        "severity": "CRITICAL",
        "cooldown_minutes": 5,
        "create_incident": True,
        "description": "PostgreSQL connectivity check failed.",
    },
    {
        "code": "redis_unhealthy",
        "name": "Redis Unavailable",
        "service": "REDIS",
        "metric_type": "redis_healthy",
        "operator": "LT",
        "threshold": 1.0,
        "window_minutes": 1,
        "severity": "CRITICAL",
        "cooldown_minutes": 5,
        "create_incident": True,
        "description": "Redis connectivity check failed.",
    },
    {
        "code": "celery_worker_down",
        "name": "Celery Worker Down",
        "service": "CELERY",
        "metric_type": "celery_workers",
        "operator": "LT",
        "threshold": 1.0,
        "window_minutes": 5,
        "severity": "CRITICAL",
        "cooldown_minutes": 10,
        "create_incident": True,
        "description": "No active Celery workers responded to ping.",
    },
    {
        "code": "celery_queue_buildup",
        "name": "Celery Queue Buildup",
        "service": "CELERY",
        "metric_type": "celery_queue_depth",
        "operator": "GT",
        "threshold": 100.0,
        "window_minutes": 5,
        "severity": "WARNING",
        "cooldown_minutes": 15,
        "create_incident": False,
        "description": "More than 100 tasks waiting in the Celery queue.",
    },
    {
        "code": "celery_failure_rate_high",
        "name": "High Celery Failure Rate",
        "service": "CELERY",
        "metric_type": "celery_failure_rate",
        "operator": "GT",
        "threshold": 20.0,
        "window_minutes": 15,
        "severity": "WARNING",
        "cooldown_minutes": 30,
        "create_incident": False,
        "description": "Celery task failure rate exceeds 20%.",
    },
    {
        "code": "workflow_failure_rate_high",
        "name": "High Workflow Failure Rate",
        "service": "WORKFLOW",
        "metric_type": "workflow_failure_rate",
        "operator": "GT",
        "threshold": 15.0,
        "window_minutes": 15,
        "severity": "WARNING",
        "cooldown_minutes": 30,
        "create_incident": False,
        "description": "Workflow execution failure rate exceeds 15%.",
    },
    {
        "code": "webhook_failure_spike",
        "name": "Webhook Failure Spike",
        "service": "WEBHOOK",
        "metric_type": "webhook_failure_rate",
        "operator": "GT",
        "threshold": 25.0,
        "window_minutes": 15,
        "severity": "WARNING",
        "cooldown_minutes": 30,
        "create_incident": False,
        "description": "Outbound webhook failure rate exceeds 25%.",
    },
    {
        "code": "notification_failure_spike",
        "name": "Notification Failure Spike",
        "service": "NOTIFICATION",
        "metric_type": "notification_failure_rate",
        "operator": "GT",
        "threshold": 20.0,
        "window_minutes": 15,
        "severity": "WARNING",
        "cooldown_minutes": 30,
        "create_incident": False,
        "description": "Notification delivery failure rate exceeds 20%.",
    },
    {
        "code": "error_event_spike",
        "name": "Error Event Spike",
        "service": "ERROR",
        "metric_type": "error_spike_count",
        "operator": "GT",
        "threshold": 20.0,
        "window_minutes": 10,
        "severity": "WARNING",
        "cooldown_minutes": 30,
        "create_incident": False,
        "description": "More than 20 aggregated error events in 10 minutes.",
    },
    {
        "code": "integration_failure_spike",
        "name": "External Integration Failure Spike",
        "service": "INTEGRATION",
        "metric_type": "integration_failure_rate",
        "operator": "GT",
        "threshold": 30.0,
        "window_minutes": 15,
        "severity": "WARNING",
        "cooldown_minutes": 30,
        "create_incident": False,
        "description": "External integration failure rate exceeds 30%.",
    },
]

# Default SLOs seeded on fresh installations (idempotent data migration).
DEFAULT_SLOS = [
    {
        "code": "api_availability",
        "name": "API Availability",
        "service": "API",
        "slo_type": "AVAILABILITY",
        "target": 99.5,
        "window_days": 30,
        "is_contractual": False,
        "description": "Internal availability target — not a contractual SLA.",
    },
    {
        "code": "api_latency_p95",
        "name": "API P95 Latency",
        "service": "API",
        "slo_type": "LATENCY",
        "target": 2000.0,
        "window_days": 30,
        "is_contractual": False,
        "evaluation_config": {"latency_ms": 2000},
        "description": "95% of API requests complete within 2000ms.",
    },
    {
        "code": "api_error_rate",
        "name": "API Error Rate",
        "service": "API",
        "slo_type": "ERROR_RATE",
        "target": 5.0,
        "window_days": 30,
        "is_contractual": False,
        "description": "Less than 5% of API requests return 5xx responses.",
    },
    {
        "code": "workflow_success_rate",
        "name": "Workflow Execution Success",
        "service": "WORKFLOW",
        "slo_type": "SUCCESS_RATE",
        "target": 95.0,
        "window_days": 30,
        "is_contractual": False,
        "description": "95% of workflow executions complete successfully.",
    },
    {
        "code": "notification_delivery",
        "name": "Notification Delivery",
        "service": "NOTIFICATION",
        "slo_type": "SUCCESS_RATE",
        "target": 98.0,
        "window_days": 30,
        "is_contractual": False,
        "description": "98% of notifications delivered without failure.",
    },
    {
        "code": "webhook_success_rate",
        "name": "Webhook Delivery Success",
        "service": "WEBHOOK",
        "slo_type": "SUCCESS_RATE",
        "target": 90.0,
        "window_days": 30,
        "is_contractual": False,
        "description": "90% of outbound webhooks delivered successfully.",
    },
]