from django.test import TestCase
from django.utils import timezone

from apps.monitoring.constants import MonitoringService, SLOType
from apps.monitoring.models import (
    ExternalServiceMetric,
    NotificationDeliveryMetric,
    RequestLatencySample,
    RequestMetric,
    ServiceSLO,
    WebhookDelivery,
)
from apps.monitoring.slos import SLOComputeService
from apps.monitoring.services import MetricsService


class SLOComputeServiceTests(TestCase):
    def test_availability_slo_from_request_metrics(self):
        MetricsService.record_request(
            method="GET", path="/api/v1/menu/", status_code=200, duration_ms=50
        )
        MetricsService.record_request(
            method="GET", path="/api/v1/menu/", status_code=500, duration_ms=50
        )
        slo = ServiceSLO.objects.create(
            name="API Availability", code="slo.api.availability",
            service=MonitoringService.API, slo_type=SLOType.AVAILABILITY,
            target=99.0, window_days=1,
        )
        result = SLOComputeService.compute(slo)
        self.assertEqual(result["sli"], 50.0)
        self.assertEqual(result["error_budget_remaining"], 0.0)

    def test_latency_slo_from_samples(self):
        RequestLatencySample.objects.create(
            sampled_at=timezone.now(), endpoint="/x", method="GET",
            status_class="2xx", duration_ms=100,
        )
        RequestLatencySample.objects.create(
            sampled_at=timezone.now(), endpoint="/x", method="GET",
            status_class="2xx", duration_ms=900,
        )
        slo = ServiceSLO.objects.create(
            name="API Latency", code="slo.api.latency",
            service=MonitoringService.API, slo_type=SLOType.LATENCY,
            target=500, window_days=1,
            evaluation_config={"latency_ms": 500},
        )
        result = SLOComputeService.compute(slo)
        self.assertEqual(result["sli"], 50.0)

    def test_webhook_success_slo(self):
        WebhookDelivery.objects.create(host="hooks.example", path="/a", success=True)
        WebhookDelivery.objects.create(host="hooks.example", path="/b", success=False)
        slo = ServiceSLO.objects.create(
            name="Webhook Success", code="slo.webhook",
            service=MonitoringService.WEBHOOK, slo_type=SLOType.SUCCESS_RATE,
            target=95.0, window_days=1,
        )
        result = SLOComputeService.compute(slo)
        self.assertEqual(result["sli"], 50.0)

    def test_integration_success_slo(self):
        ExternalServiceMetric.objects.create(service="PAYMENT", status="SUCCESS")
        ExternalServiceMetric.objects.create(service="PAYMENT", status="FAILURE")
        slo = ServiceSLO.objects.create(
            name="Integration Success", code="slo.integration",
            service=MonitoringService.INTEGRATION, slo_type=SLOType.SUCCESS_RATE,
            target=95.0, window_days=1,
        )
        result = SLOComputeService.compute(slo)
        self.assertEqual(result["sli"], 50.0)

    def test_notification_success_slo(self):
        NotificationDeliveryMetric.objects.create(channel="REALTIME", status="SENT")
        NotificationDeliveryMetric.objects.create(channel="REALTIME", status="FAILED")
        slo = ServiceSLO.objects.create(
            name="Notification Success", code="slo.notification",
            service=MonitoringService.NOTIFICATION, slo_type=SLOType.SUCCESS_RATE,
            target=95.0, window_days=1,
        )
        result = SLOComputeService.compute(slo)
        self.assertEqual(result["sli"], 50.0)

    def test_no_data_returns_none(self):
        slo = ServiceSLO.objects.create(
            name="Empty", code="slo.empty",
            service=MonitoringService.API, slo_type=SLOType.AVAILABILITY,
            target=99.0, window_days=1,
        )
        result = SLOComputeService.compute(slo)
        self.assertIsNone(result["sli"])

    def test_evaluate_all_persists_results(self):
        RequestMetric.objects.create(
            bucket_minute=timezone.now(), method="GET", endpoint="/api/v1/menu/",
            status_class="2xx", count=10, error_count=0,
            total_duration_ms=500, max_duration_ms=100,
        )
        slo = ServiceSLO.objects.create(
            name="API Availability", code="slo.api.avail2",
            service=MonitoringService.API, slo_type=SLOType.AVAILABILITY,
            target=99.0, window_days=1,
        )
        results = SLOComputeService.evaluate_all()
        self.assertEqual(results["evaluated"], 1)
        slo.refresh_from_db()
        self.assertEqual(slo.latest_sli, 100.0)
        self.assertIsNotNone(slo.evaluated_at)