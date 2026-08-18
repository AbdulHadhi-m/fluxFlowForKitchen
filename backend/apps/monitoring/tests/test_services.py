from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditActorType, AuditEntityType, AuditLog
from apps.monitoring.constants import (
    DeliveryChannel,
    DeliveryStatus,
    ErrorModule,
    ErrorSeverity,
    ExternalCallStatus,
    ExternalService,
    TaskRunStatus,
)
from apps.monitoring.models import (
    CeleryTaskRun,
    ErrorEvent,
    ExternalServiceMetric,
    MonitoringConfig,
    NotificationDeliveryMetric,
    RequestMetric,
)
from apps.monitoring.services import (
    ConfigService,
    ErrorTrackingService,
    ExternalCallRecorder,
    MetricsService,
    NotificationDeliveryRecorder,
    RetentionService,
    fingerprint_error,
    normalize_path,
)


class NormalizationTests(TestCase):
    def test_normalize_path_handles_uuids(self):
        self.assertEqual(
            normalize_path("/api/v1/orders/4a8c0f1a-5a12-4a9d-9c21-2b3f4a5b6c7d/"),
            "/api/v1/orders/{uuid}/",
        )

    def test_normalize_path_handles_integers(self):
        self.assertEqual(normalize_path("/api/v1/menu/items/42/"), "/api/v1/menu/items/{id}/")

    def test_fingerprint_is_stable_and_unique(self):
        fp1 = fingerprint_error("ValueError", "bad value", "api.views")
        fp2 = fingerprint_error("ValueError", "bad value", "api.views")
        fp3 = fingerprint_error("ValueError", "bad value", "api.other")
        self.assertEqual(fp1, fp2)
        self.assertNotEqual(fp1, fp3)


class ErrorTrackingServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="dev@mon.com", password="Password123!")

    def test_record_exception_deduplicates_by_fingerprint(self):
        class DummyError(Exception):
            pass

        first = ErrorTrackingService.record_exception(
            DummyError("boom"), module="tests.module"
        )
        second = ErrorTrackingService.record_exception(
            DummyError("boom"), module="tests.module"
        )
        self.assertIsNotNone(first)
        self.assertIsNotNone(second)
        self.assertEqual(first.id, second.id)
        event = ErrorEvent.objects.get()
        self.assertEqual(event.count, 2)
        self.assertEqual(event.severity, ErrorSeverity.MEDIUM)
        self.assertEqual(event.module, "tests.module")

    def test_record_frontend_creates_event(self):
        event = ErrorTrackingService.record_frontend(
            message="Cannot read properties of undefined",
            stack="at App.render (App.tsx:12)",
            url="/orders",
            component="OrderList",
            endpoint="/api/v1/orders/",
            method="GET",
            status_code=500,
            severity=ErrorSeverity.MEDIUM,
            user=self.user,
            correlation_id="corr-front-1",
        )
        self.assertIsNotNone(event)
        self.assertEqual(event.module, ErrorModule.FRONTEND)
        self.assertEqual(event.count, 1)
        self.assertEqual(event.metadata["component"], "OrderList")

    def test_update_status_persists_resolution(self):
        event = ErrorTrackingService.record_exception(
            ValueError("nope"), module="tests.module"
        )
        updated = ErrorTrackingService.update_status(event, "RESOLVED", user=self.user)
        updated.refresh_from_db()
        self.assertEqual(updated.status, "RESOLVED")
        self.assertIsNotNone(
            AuditLog.objects.filter(entity_type=AuditEntityType.ERROR_EVENT).first()
        )

    def test_record_celery_failure(self):
        class TaskError(Exception):
            pass

        ErrorTrackingService.record_celery_failure(
            task_name="orders.process", exception=TaskError("celery boom"), correlation_id="c-1"
        )
        event = ErrorEvent.objects.get()
        self.assertEqual(event.module, ErrorModule.CELERY)


class MetricsServiceTests(TestCase):
    def test_record_request_creates_buckets(self):
        MetricsService.record_request(
            method="GET", path="/api/v1/menu/items/", status_code=200, duration_ms=150
        )
        metric = RequestMetric.objects.get()
        self.assertEqual(metric.count, 1)
        self.assertGreaterEqual(metric.max_duration_ms, 150)


class RecorderTests(TestCase):
    def test_external_call_recorder(self):
        ExternalCallRecorder.record(
            service=ExternalService.PAYMENT,
            status=ExternalCallStatus.SUCCESS,
            duration_ms=220,
        )
        metric = ExternalServiceMetric.objects.get()
        self.assertEqual(metric.status, ExternalCallStatus.SUCCESS)
        self.assertEqual(metric.duration_ms, 220)

    def test_notification_delivery_recorder(self):
        NotificationDeliveryRecorder.record(
            channel=DeliveryChannel.REALTIME,
            notification_type="SYSTEM_ALERT",
            status=DeliveryStatus.SENT,
        )
        metric = NotificationDeliveryMetric.objects.get()
        self.assertEqual(metric.channel, DeliveryChannel.REALTIME)
        self.assertEqual(metric.status, DeliveryStatus.SENT)


class ConfigServiceTests(TestCase):
    def tearDown(self):
        ConfigService.invalidate()

    def test_singleton_and_override(self):
        config = ConfigService.get()
        self.assertIsInstance(config, MonitoringConfig)
        self.assertEqual(config.metrics_enabled, True)

    def test_invalidation(self):
        ConfigService.invalidate()
        first = ConfigService.get()
        MonitoringConfig.objects.update(slow_query_threshold_ms=999)
        ConfigService.invalidate()
        second = ConfigService.get()
        self.assertEqual(second.slow_query_threshold_ms, 999)
        self.assertEqual(first.pk, second.pk)


class RetentionServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="ret@mon.com", password="Password123!")

    def test_cleanup_removes_expired_rows(self):
        ErrorTrackingService.record_frontend(
            message="old error", url="/x", component="X",
            severity=ErrorSeverity.LOW, user=self.user,
        )
        ErrorEvent.objects.update(last_seen=timezone.now() - timedelta(days=400))
        CeleryTaskRun.objects.create(
            task_name="orders.process", status=TaskRunStatus.SUCCESS,
            started_at=timezone.now() - timedelta(days=400),
            finished_at=timezone.now() - timedelta(days=400),
            duration_ms=10,
        )
        RequestMetric.objects.create(
            method="GET", endpoint="/api/v1/menu/", status_class="2xx",
            count=1, max_duration_ms=1, bucket_minute=timezone.now() - timedelta(days=400),
        )
        config = ConfigService.get()
        config.error_retention_days = 30
        config.metric_retention_days = 30
        config.task_retention_days = 30
        config.save()
        ConfigService.invalidate()

        RetentionService.cleanup()
        self.assertEqual(CeleryTaskRun.objects.count(), 0)
        self.assertEqual(RequestMetric.objects.count(), 0)
        self.assertEqual(ErrorEvent.objects.count(), 0)

    def test_cleanup_keeps_fresh_rows(self):
        ErrorTrackingService.record_frontend(
            message="fresh error", url="/x", component="X",
            severity=ErrorSeverity.LOW, user=self.user,
        )
        RetentionService.cleanup()
        self.assertEqual(ErrorEvent.objects.count(), 1)


class AuditIntegrationTests(TestCase):
    def test_error_status_change_is_audited(self):
        user = User.objects.create_user(email="audit@mon.com", password="Password123!")
        event = ErrorTrackingService.record_exception(
            ValueError("audit me"), module="tests.module"
        )
        ErrorTrackingService.update_status(event, "RESOLVED", user=user)
        log = AuditLog.objects.filter(entity_type=AuditEntityType.ERROR_EVENT).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor_type, AuditActorType.USER)