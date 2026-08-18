import logging
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.monitoring.alerts import AlertEngine
from apps.monitoring.constants import AlertSeverity, AlertStatus
from apps.monitoring.models import Alert, AlertRule, MonitoringIncident


class AlertEngineTests(TestCase):
    def setUp(self):
        self.rule = AlertRule.objects.create(
            name="API Error Rate High",
            code="test.api_error_rate",
            metric_type="api_error_rate",
            operator="GTE",
            threshold=5.0,
            window_minutes=5,
            severity=AlertSeverity.CRITICAL,
            cooldown_minutes=1,
            auto_resolve_minutes=10,
            create_incident=True,
        )

    def _patch_metric(self, value):
        return patch("apps.monitoring.alerts.get_metric_value", return_value=value)

    def test_trigger_creates_alert_and_audit(self):
        with self._patch_metric(8.0):
            summary = AlertEngine.evaluate()
        self.assertEqual(summary["triggered"], 1)
        alert = Alert.objects.get(rule=self.rule)
        self.assertEqual(alert.status, AlertStatus.ACTIVE)
        self.assertEqual(alert.trigger_count, 1)
        self.assertIsNotNone(AuditLog.objects.filter(entity_type="ALERT").first())

    def test_retrigger_is_deduplicated_and_counts(self):
        with self._patch_metric(8.0):
            AlertEngine.evaluate()
            AlertEngine.evaluate()
        alerts = Alert.objects.filter(rule=self.rule)
        self.assertEqual(alerts.count(), 1)
        self.assertEqual(alerts.first().trigger_count, 2)

    def test_critical_rule_creates_incident(self):
        with self._patch_metric(8.0):
            AlertEngine.evaluate()
        incident = MonitoringIncident.objects.filter(source_alert__rule=self.rule).first()
        self.assertIsNotNone(incident)
        self.assertEqual(incident.severity, AlertSeverity.CRITICAL)
        alert = Alert.objects.get(rule=self.rule)
        self.assertEqual(alert.incident, incident)

    def test_acknowledge_and_resolve(self):
        with self._patch_metric(8.0):
            AlertEngine.evaluate()
        alert = Alert.objects.get(rule=self.rule)
        user = User.objects.create_user(email="ops@mon.com", password="Password123!")
        AlertEngine.acknowledge(alert, user)
        alert.refresh_from_db()
        self.assertEqual(alert.status, AlertStatus.ACKNOWLEDGED)

        AlertEngine.resolve(alert, user=user, resolution_note="Fixed by ops.")
        alert.refresh_from_db()
        self.assertEqual(alert.status, AlertStatus.RESOLVED)
        self.assertIsNotNone(alert.resolved_at)
        self.assertEqual(alert.resolved_by, user)

    def test_auto_resolve_after_condition_clears(self):
        with self._patch_metric(8.0):
            AlertEngine.evaluate()
        alert = Alert.objects.get(rule=self.rule)
        # Simulate the breach clearing for longer than auto_resolve_minutes
        alert.last_triggered_at = timezone.now() - timedelta(minutes=20)
        alert.save(update_fields=["last_triggered_at"])
        with self._patch_metric(0.0):
            summary = AlertEngine.evaluate()
        self.assertEqual(summary["resolved"], 1)
        alert.refresh_from_db()
        self.assertEqual(alert.status, AlertStatus.RESOLVED)

    def test_inactive_rule_not_evaluated(self):
        self.rule.is_active = False
        self.rule.save(update_fields=["is_active"])
        with self._patch_metric(8.0):
            summary = AlertEngine.evaluate()
        self.assertEqual(summary["evaluated"], 0)
        self.assertEqual(Alert.objects.count(), 0)