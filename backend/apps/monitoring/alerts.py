"""Alert engine: rule evaluation, deduplication, cooldowns, notifications,
audit integration, and incident creation for critical conditions.

Reuses Prompt 18 notifications and Prompt 19 audit infrastructure — no new
notification or audit systems are introduced.
"""
import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditActorType
from apps.audit.services import AuditLogService
from apps.monitoring.constants import AlertSeverity, AlertStatus
from apps.monitoring.models import Alert, AlertRule
from apps.monitoring.queries import get_metric_value
from apps.monitoring.services import ConfigService

logger = logging.getLogger("fluxiflow.monitoring.alerts")

_OPERATORS = {
    "GT": lambda value, threshold: value > threshold,
    "GTE": lambda value, threshold: value >= threshold,
    "LT": lambda value, threshold: value < threshold,
    "LTE": lambda value, threshold: value <= threshold,
}


class AlertEngine:
    """Evaluates active alert rules and manages alert lifecycle."""

    @classmethod
    def evaluate(cls) -> dict:
        """Evaluate every active rule once. Returns summary counts."""
        summary = {"evaluated": 0, "triggered": 0, "updated": 0, "resolved": 0}
        rules = AlertRule.objects.filter(is_active=True)
        for rule in rules:
            summary["evaluated"] += 1
            try:
                value = get_metric_value(rule.metric_type, rule.window_minutes)
            except Exception:
                logger.error("Alert rule %s evaluation failed", rule.code, exc_info=True)
                continue

            if value is None:
                continue

            breached = _OPERATORS.get(rule.operator, lambda v, t: False)(value, rule.threshold)
            if breached:
                result = cls._trigger(rule, value)
                summary[result] += 1
            else:
                if cls._auto_resolve(rule):
                    summary["resolved"] += 1
        return summary

    @classmethod
    def _trigger(cls, rule: AlertRule, value: float) -> str:
        """Create or update the ACTIVE alert for a rule (deduplicated)."""
        now = timezone.now()
        alert = Alert.objects.filter(rule=rule, status=AlertStatus.ACTIVE).first()

        if alert:
            cooldown_active = (now - alert.last_triggered_at) < timedelta(minutes=rule.cooldown_minutes)
            Alert.objects.filter(pk=alert.pk).update(
                metric_value=value,
                last_triggered_at=now,
                trigger_count=models_F_count(alert),
            )
            if not cooldown_active:
                cls._notify(rule, alert)
                cls._audit(rule, alert, "triggered")
            return "updated"

        message = cls._build_message(rule, value)
        alert = Alert.objects.create(
            rule=rule,
            status=AlertStatus.ACTIVE,
            severity=rule.severity,
            title=rule.name,
            message=message,
            metric_value=value,
            dedup_key=f"{rule.code}:{rule.metric_type}",
            first_triggered_at=now,
            last_triggered_at=now,
            trigger_count=1,
        )
        cls._audit(rule, alert, "created")
        cls._notify(rule, alert)

        if rule.create_incident and rule.severity == AlertSeverity.CRITICAL:
            from apps.monitoring.incidents import IncidentService

            incident = IncidentService.create_from_alert(alert)
            if incident:
                Alert.objects.filter(pk=alert.pk).update(incident=incident)
        return "triggered"

    @classmethod
    def _auto_resolve(cls, rule: AlertRule) -> bool:
        """Resolve ACTIVE alerts once the condition clears for long enough."""
        threshold = timezone.now() - timedelta(minutes=rule.auto_resolve_minutes)
        alerts = Alert.objects.filter(
            rule=rule, status=AlertStatus.ACTIVE, last_triggered_at__lt=threshold
        )
        resolved = 0
        for alert in alerts:
            cls.resolve(alert, resolution_note="Auto-resolved: condition cleared.")
            resolved += 1
        return resolved > 0

    @classmethod
    def _build_message(cls, rule: AlertRule, value: float) -> str:
        return (
            f"{rule.name}: value {value} {rule.operator} threshold {rule.threshold} "
            f"over the last {rule.window_minutes} minute(s)."
        )

    @classmethod
    def resolve(
        cls,
        alert: Alert,
        user=None,
        resolution_note: str = "",
        auto: bool = False,
    ) -> Alert:
        if alert.status == AlertStatus.RESOLVED:
            return alert
        now = timezone.now()
        Alert.objects.filter(pk=alert.pk).update(
            status=AlertStatus.RESOLVED,
            resolved_at=now,
            resolved_by=user if not auto else None,
            resolution_note=(resolution_note or "")[:1000],
        )
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = now
        alert.resolution_note = resolution_note
        cls._audit(alert.rule, alert, "resolved", user=user)
        return alert

    @classmethod
    def acknowledge(cls, alert: Alert, user) -> Alert:
        if alert.status in (AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED):
            return alert
        now = timezone.now()
        Alert.objects.filter(pk=alert.pk).update(
            status=AlertStatus.ACKNOWLEDGED, acknowledged_at=now, acknowledged_by=user
        )
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = now
        alert.acknowledged_by = user
        cls._audit(alert.rule, alert, "acknowledged", user=user)
        return alert

    @classmethod
    def _notify(cls, rule: AlertRule, alert: Alert) -> None:
        """Reuse the Prompt 18 notification system. Never raises."""
        try:
            title = f"{alert.severity.title()} Alert: {alert.title}"
            message = alert.message[:500]
            if alert.restaurant:
                from apps.notifications.services import NotificationService

                NotificationService.notify_users_with_permission(
                    restaurant=alert.restaurant,
                    permission_code=rule.notify_permission,
                    notification_type="SYSTEM_ALERT",
                    title=title,
                    message=message,
                    severity=alert.severity,
                    action_url="/monitoring/alerts",
                    entity_type="ALERT",
                    entity_id=str(alert.id),
                    deduplication_key_prefix=f"monitoring-alert-{rule.code}",
                )
            else:
                cls._push_realtime(alert)
        except Exception:
            logger.error("Alert notification dispatch failed", exc_info=True)

    @classmethod
    def _push_realtime(cls, alert: Alert) -> None:
        """Realtime push to superuser groups for system-wide alerts (no DB row
        is possible without a tenant context — pure realtime event)."""
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from django.contrib.auth import get_user_model

        User = get_user_model()
        superusers = User.objects.filter(is_superuser=True, is_active=True).values_list("id", flat=True)
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        for user_id in superusers:
            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
                {
                    "type": "system.alert",
                    "data": {
                        "id": str(alert.id),
                        "title": alert.title,
                        "message": alert.message[:300],
                        "severity": alert.severity,
                        "service": alert.rule.service,
                        "created_at": alert.created_at.isoformat(),
                    },
                },
            )

    @classmethod
    def _audit(cls, rule: AlertRule, alert: Alert, action: str, user=None) -> None:
        try:
            description = {
                "created": f"Alert triggered: {alert.title}",
                "triggered": f"Alert re-triggered: {alert.title}",
                "acknowledged": f"Alert acknowledged: {alert.title}",
                "resolved": f"Alert resolved: {alert.title}",
            }.get(action, f"Alert {action}: {alert.title}")
            AuditLogService.record(
                action="CREATE" if action == "created" else "STATUS_CHANGED",
                entity_type="ALERT",
                entity_id=str(alert.id),
                description=description,
                restaurant=alert.restaurant,
                actor_user=user,
                actor_type=AuditActorType.USER if user else AuditActorType.SYSTEM,
                metadata={
                    "rule_code": rule.code,
                    "metric_type": rule.metric_type,
                    "severity": alert.severity,
                    "status": alert.status,
                    "metric_value": alert.metric_value,
                },
            )
        except Exception:
            logger.debug("Alert audit record skipped", exc_info=True)


def models_F_count(alert: Alert) -> int:
    """Increment trigger_count via database expression."""
    from django.db.models import F

    return F("trigger_count") + 1


def reset_config_cache():
    """Clear the cached MonitoringConfig after runtime changes."""
    ConfigService.invalidate()