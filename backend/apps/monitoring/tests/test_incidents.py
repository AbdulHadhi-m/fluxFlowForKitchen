from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.monitoring.constants import AlertSeverity, IncidentStatus, MonitoringService
from apps.monitoring.incidents import IncidentService
from apps.monitoring.models import Alert, AlertRule, MonitoringIncident


class IncidentServiceTests(TestCase):
    def setUp(self):
        self.rule = AlertRule.objects.create(
            name="Webhook Down", code="test.webhook_down",
            service=MonitoringService.WEBHOOK,
            metric_type="webhook_failure_count", operator="GT", threshold=10,
            severity=AlertSeverity.CRITICAL,
        )
        self.alert = Alert.objects.create(
            rule=self.rule,
            status="ACTIVE",
            severity=AlertSeverity.CRITICAL,
            title="Webhook Down",
            message="Webhook failing",
            metric_value=15,
            first_triggered_at=timezone.now(),
            last_triggered_at=timezone.now(),
        )

    def test_create_from_alert(self):
        incident = IncidentService.create_from_alert(self.alert)
        self.assertIsNotNone(incident)
        self.assertEqual(incident.status, IncidentStatus.OPEN)
        self.assertEqual(incident.affected_service, MonitoringService.WEBHOOK)
        self.assertEqual(incident.source_alert, self.alert)
        self.assertEqual(len(incident.timeline), 1)
        self.assertIsNotNone(AuditLog.objects.filter(entity_type="MONITORING_INCIDENT").first())

    def test_acknowledge_sets_mtta(self):
        incident = IncidentService.create_from_alert(self.alert)
        user = User.objects.create_user(email="oncall@mon.com", password="Password123!")
        incident = IncidentService.acknowledge(incident, user)
        incident.refresh_from_db()
        self.assertEqual(incident.status, IncidentStatus.INVESTIGATING)
        self.assertEqual(incident.acknowledged_by, user)
        self.assertIsNotNone(incident.mtta_minutes)
        self.assertEqual(len(incident.timeline), 2)

    def test_resolve_sets_mttr(self):
        incident = IncidentService.create_from_alert(self.alert)
        user = User.objects.create_user(email="oncall@mon.com", password="Password123!")
        incident = IncidentService.acknowledge(incident, user)
        incident = IncidentService.resolve(incident, user, notes="Deployed fix.")
        incident.refresh_from_db()
        self.assertEqual(incident.status, IncidentStatus.RESOLVED)
        self.assertIsNotNone(incident.mttr_minutes)
        self.assertEqual(incident.resolution_notes, "Deployed fix.")

    def test_add_note_appends_timeline(self):
        incident = IncidentService.create_from_alert(self.alert)
        user = User.objects.create_user(email="oncall@mon.com", password="Password123!")
        incident = IncidentService.add_note(incident, user, "Investigating retry storm.")
        incident.refresh_from_db()
        self.assertEqual(len(incident.timeline), 2)
        self.assertEqual(incident.timeline[1]["text"], "Investigating retry storm.")

    def test_resolve_also_resolves_linked_alert(self):
        incident = IncidentService.create_from_alert(self.alert)
        self.alert.incident = incident
        self.alert.save(update_fields=["incident"])
        user = User.objects.create_user(email="oncall@mon.com", password="Password123!")
        IncidentService.resolve(incident, user, notes="Fixed.")
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, "RESOLVED")

    def test_metrics_counts(self):
        IncidentService.create_from_alert(self.alert)
        IncidentService.create_from_alert(self.alert)
        metrics = IncidentService.metrics(30)
        self.assertEqual(metrics["incident_count"], 2)
        self.assertEqual(metrics["open_count"], 2)
        self.assertIn("mtta_minutes", metrics)
        self.assertIn("mttr_minutes", metrics)