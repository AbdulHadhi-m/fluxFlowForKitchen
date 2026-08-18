"""Operational incident service with timeline tracking and MTTA/MTTR
measurement. Critical alerts may auto-create incidents; incidents can be
optionally linked to Prompt 34 security incidents.
"""
import logging
from datetime import timedelta

from django.utils import timezone

from apps.audit.models import AuditActorType
from apps.audit.services import AuditLogService
from apps.monitoring.constants import (
    AlertSeverity,
    IncidentStatus,
    IncidentTimelineType,
)
from apps.monitoring.models import Alert, MonitoringIncident

logger = logging.getLogger("fluxiflow.monitoring.incidents")


class IncidentService:
    """Manages operational incident lifecycle and MTTA/MTTR tracking."""

    @classmethod
    def create_from_alert(cls, alert: Alert) -> MonitoringIncident:
        try:
            now = timezone.now()
            incident = MonitoringIncident.objects.create(
                title=f"{alert.rule.service} — {alert.title}",
                description=alert.message[:2000],
                severity=alert.severity,
                status=IncidentStatus.OPEN,
                affected_service=alert.rule.service,
                source_alert=alert,
                restaurant=alert.restaurant,
                detected_at=now,
                timeline=[{
                    "timestamp": now.isoformat(),
                    "type": IncidentTimelineType.DETECTED,
                    "actor": "system",
                    "text": f"Incident auto-created from alert: {alert.title}",
                }],
            )
            cls._audit(incident, "created")
            return incident
        except Exception:
            logger.error("Incident creation from alert failed", exc_info=True)
            return None

    @classmethod
    def acknowledge(cls, incident: MonitoringIncident, user) -> MonitoringIncident:
        if incident.status not in (IncidentStatus.OPEN, IncidentStatus.INVESTIGATING):
            return incident
        now = timezone.now()
        incident.status = IncidentStatus.INVESTIGATING
        incident.acknowledged_at = now
        incident.acknowledged_by = user
        if incident.detected_at:
            incident.mtta_minutes = int((now - incident.detected_at).total_seconds() / 60)
        cls._append_timeline(incident, IncidentTimelineType.ACKNOWLEDGED, user, "Incident acknowledged.")
        incident.save()
        cls._audit(incident, "acknowledged", user=user)
        return incident

    @classmethod
    def resolve(cls, incident: MonitoringIncident, user, notes: str = "") -> MonitoringIncident:
        if incident.status in (IncidentStatus.RESOLVED, IncidentStatus.CLOSED):
            return incident
        now = timezone.now()
        incident.status = IncidentStatus.RESOLVED
        incident.resolved_at = now
        incident.resolved_by = user
        incident.resolution_notes = notes[:2000]
        if incident.detected_at:
            incident.mttr_minutes = int((now - incident.detected_at).total_seconds() / 60)
        cls._append_timeline(incident, IncidentTimelineType.RESOLVED, user, notes or "Incident resolved.")
        incident.save()
        cls._audit(incident, "resolved", user=user)

        # Auto-resolve linked alerts
        if incident.source_alert and incident.source_alert.status != "RESOLVED":
            from apps.monitoring.alerts import AlertEngine

            AlertEngine.resolve(incident.source_alert, user=user, resolution_note="Resolved via incident.")
        return incident

    @classmethod
    def add_note(cls, incident: MonitoringIncident, user, text: str) -> MonitoringIncident:
        cls._append_timeline(incident, IncidentTimelineType.COMMENT, user, text[:2000])
        incident.save(update_fields=["timeline", "updated_at"])
        return incident

    @classmethod
    def _append_timeline(cls, incident, timeline_type, user, text: str) -> None:
        timeline = incident.timeline or []
        timeline.append({
            "timestamp": timezone.now().isoformat(),
            "type": timeline_type,
            "actor": user.email if user else "system",
            "text": text,
        })
        incident.timeline = timeline

    @classmethod
    def _audit(cls, incident: MonitoringIncident, action: str, user=None) -> None:
        try:
            AuditLogService.record(
                action="CREATE" if action == "created" else "STATUS_CHANGED",
                entity_type="MONITORING_INCIDENT",
                entity_id=str(incident.id),
                description=f"Monitoring incident {action}: {incident.title}",
                restaurant=incident.restaurant,
                actor_user=user,
                actor_type=AuditActorType.USER if user else AuditActorType.SYSTEM,
                metadata={
                    "severity": incident.severity,
                    "status": incident.status,
                    "affected_service": incident.affected_service,
                    "mtta_minutes": incident.mtta_minutes,
                    "mttr_minutes": incident.mttr_minutes,
                },
            )
        except Exception:
            logger.debug("Incident audit record skipped", exc_info=True)

    @classmethod
    def metrics(cls, window_days: int = 30) -> dict:
        """MTTA/MTTR aggregates over resolved incidents."""
        since = timezone.now() - timedelta(days=window_days)
        incidents = MonitoringIncident.objects.filter(detected_at__gte=since)
        resolved = [i for i in incidents if i.mttr_minutes is not None]
        acked = [i for i in incidents if i.mtta_minutes is not None]

        def average(items, key):
            values = [getattr(i, key) for i in items if getattr(i, key) is not None]
            return int(sum(values) / len(values)) if values else None

        return {
            "window_days": window_days,
            "incident_count": incidents.count(),
            "open_count": incidents.filter(status__in=[IncidentStatus.OPEN, IncidentStatus.INVESTIGATING]).count(),
            "mtta_minutes": average(acked, "mtta_minutes"),
            "mttr_minutes": average(resolved, "mttr_minutes"),
            "by_severity": {
                severity: incidents.filter(severity=severity).count()
                for severity in [AlertSeverity.INFO, AlertSeverity.WARNING, AlertSeverity.CRITICAL]
            },
        }