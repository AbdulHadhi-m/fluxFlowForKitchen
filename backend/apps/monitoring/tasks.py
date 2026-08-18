"""Scheduled monitoring tasks: alert evaluation, stuck-task detection,
SLO evaluation, and retention cleanup."""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from apps.monitoring.constants import TaskRunStatus
from apps.monitoring.models import CeleryTaskRun
from apps.monitoring.services import ConfigService, RetentionService

logger = logging.getLogger("fluxiflow.monitoring.tasks")


@shared_task(name="monitoring.evaluate_alerts", bind=True, max_retries=2, default_retry_delay=30)
def evaluate_alerts(self):
    """Evaluate all active alert rules (section 59). Failures retry briefly."""
    from apps.monitoring.alerts import AlertEngine

    try:
        summary = AlertEngine.evaluate()
        logger.info("Alert evaluation complete: %s", summary)
        return summary
    except Exception as exc:
        logger.error("Alert evaluation crashed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(name="monitoring.evaluate_slos")
def evaluate_slos():
    """Refresh SLI and error-budget values for active SLOs."""
    from apps.monitoring.slos import SLOComputeService

    try:
        result = SLOComputeService.evaluate_all()
        logger.info("SLO evaluation complete: %s", result)
        return result
    except Exception:
        logger.error("SLO evaluation crashed", exc_info=True)
        return {"evaluated": 0}


@shared_task(name="monitoring.detect_stuck_tasks")
def detect_stuck_tasks():
    """Flag RUNNING Celery tasks exceeding the stuck threshold (section 28)."""
    try:
        config = ConfigService.get()
        threshold = timezone.now() - timedelta(minutes=config.celery_stuck_threshold_minutes)
        stuck = CeleryTaskRun.objects.filter(status=TaskRunStatus.RUNNING, started_at__lt=threshold)
        count = stuck.count()
        if count:
            logger.warning("Marking %s stuck Celery task(s)", count)
            from apps.monitoring.services import ErrorTrackingService

            for run in stuck[:50]:
                ErrorTrackingService.record(
                    error_type="StuckTask",
                    message=f"Celery task {run.task_name} exceeded {config.celery_stuck_threshold_minutes}m",
                    module="celery",
                    severity="HIGH",
                    restaurant=None,
                    user=None,
                    correlation_id=run.correlation_id,
                    metadata={"task_name": run.task_name, "started_at": run.started_at.isoformat()},
                )
            stuck.update(status=TaskRunStatus.STUCK)
        return {"stuck": count}
    except Exception:
        logger.error("Stuck-task detection crashed", exc_info=True)
        return {"stuck": 0}


@shared_task(name="monitoring.cleanup_monitoring_data")
def cleanup_monitoring_data():
    """Enforce configured retention policies (sections 92-95)."""
    try:
        result = RetentionService.cleanup()
        logger.info("Monitoring retention cleanup: %s", result)
        return result
    except Exception:
        logger.error("Monitoring retention cleanup crashed", exc_info=True)
        return {}