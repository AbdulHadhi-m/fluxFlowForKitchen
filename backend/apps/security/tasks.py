import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger("fluxiflow.security")


@shared_task(name="security.detect_suspicious_activity", max_retries=1)
def detect_suspicious_activity():
    """
    Periodic task to scan for suspicious login patterns and other anomalies.
    Creates security events and optionally alerts administrators.
    """
    from apps.security.services import SuspiciousActivityDetector, SecurityEventService
    from apps.security.models import SecurityEventType, SecurityEventSeverity

    try:
        alerts = SuspiciousActivityDetector.run_all_checks()
        for alert in alerts:
            SecurityEventService.record(
                event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
                description=f"Suspicious activity detected: {alert['rule']}",
                severity=SecurityEventSeverity.HIGH,
                metadata=alert,
            )
        if alerts:
            logger.warning(f"Detected {len(alerts)} suspicious activity alerts")
        return {"alerts_detected": len(alerts)}
    except Exception as e:
        logger.error(f"Suspicious activity detection failed: {e}", exc_info=True)
        raise


@shared_task(name="security.enforce_data_retention", max_retries=1)
def enforce_data_retention():
    """
    Periodic task to enforce data retention policies.
    Only processes policies with auto_delete=True.
    """
    from apps.security.models import DataRetentionPolicy, RetentionCategory
    from apps.accounts.models import UserSession
    from apps.notifications.models import Notification

    try:
        policies = DataRetentionPolicy.objects.filter(is_active=True, auto_delete=True)
        total_deleted = 0

        for policy in policies:
            cutoff = timezone.now() - timedelta(days=policy.retention_days)

            if policy.category == RetentionCategory.SESSION_DATA:
                count, _ = UserSession.objects.filter(
                    created_at__lt=cutoff, is_revoked=True
                ).delete()
                total_deleted += count

            elif policy.category == RetentionCategory.NOTIFICATIONS:
                count, _ = Notification.objects.filter(
                    created_at__lt=cutoff, is_read=True
                ).delete()
                total_deleted += count

            # Note: AUDIT_LOGS and SECURITY_EVENTS are NOT auto-deleted
            # They are flagged for manual review only

        logger.info(f"Data retention cleanup: {total_deleted} records purged")
        return {"records_deleted": total_deleted}
    except Exception as e:
        logger.error(f"Data retention enforcement failed: {e}", exc_info=True)
        raise


@shared_task(name="security.cleanup_expired_sessions", max_retries=1)
def cleanup_expired_sessions():
    """Clean up expired and revoked sessions older than 30 days."""
    from apps.accounts.models import UserSession

    cutoff = timezone.now() - timedelta(days=30)
    count, _ = UserSession.objects.filter(
        created_at__lt=cutoff,
    ).filter(
        models.Q(is_revoked=True) | models.Q(expires_at__lt=timezone.now())
    ).delete()

    logger.info(f"Cleaned up {count} expired sessions")
    return {"sessions_deleted": count}


@shared_task(name="security.cleanup_login_attempts", max_retries=1)
def cleanup_login_attempts():
    """Clean up login attempt logs older than 90 days."""
    from apps.security.models import LoginAttemptLog

    cutoff = timezone.now() - timedelta(days=90)
    count, _ = LoginAttemptLog.objects.filter(created_at__lt=cutoff).delete()

    logger.info(f"Cleaned up {count} login attempt records")
    return {"attempts_deleted": count}
