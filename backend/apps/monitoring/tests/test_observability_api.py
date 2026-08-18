from django.test import TestCase
from django.urls import reverse

from apps.accounts.models import User
from apps.monitoring.constants import ErrorSeverity
from apps.monitoring.models import ErrorEvent
from apps.monitoring.services import ErrorTrackingService
from apps.rbac.models import Role, TenantMembership
from apps.rbac.services import RBACService
from apps.restaurants.services import RestaurantService


class MonitoringAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.admin = User.objects.create_user(
            email="admin@monitor-a.com", password="Password123!"
        )
        self.restaurant_a, _ = RestaurantService.create_restaurant(
            user=self.admin, name="Monitor A"
        )
        self.other_admin = User.objects.create_user(
            email="admin@monitor-b.com", password="Password123!"
        )
        self.restaurant_b, _ = RestaurantService.create_restaurant(
            user=self.other_admin, name="Monitor B"
        )

        self.manager = User.objects.create_user(
            email="manager@monitor-a.com", password="Password123!"
        )
        manager_role = Role.objects.get(code="MANAGER")
        manager_mem = TenantMembership.objects.create(
            user=self.manager, tenant_id=self.restaurant_a.id, active_role=manager_role
        )
        manager_mem.assigned_roles.add(manager_role)

        self.waiter = User.objects.create_user(
            email="waiter@monitor-a.com", password="Password123!"
        )
        waiter_role = Role.objects.get(code="WAITER")
        waiter_mem = TenantMembership.objects.create(
            user=self.waiter, tenant_id=self.restaurant_a.id, active_role=waiter_role
        )
        waiter_mem.assigned_roles.add(waiter_role)

        self.admin_token = self._login("admin@monitor-a.com")
        self.other_token = self._login("admin@monitor-b.com")
        self.manager_token = self._login("manager@monitor-a.com")
        self.waiter_token = self._login("waiter@monitor-a.com")

    def _login(self, email):
        """Generate an access token directly (avoids flooding the login
        rate limit across the test session)."""
        from rest_framework_simplejwt.tokens import RefreshToken

        user = User.objects.get(email=email)
        return str(RefreshToken.for_user(user).access_token)

    def _auth(self, token):
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


class ErrorEventAPITests(MonitoringAPITests):
    def setUp(self):
        super().setUp()
        self.event_a = ErrorTrackingService.record_frontend(
            message="TypeError in OrderList",
            stack="at OrderList (OrderList.tsx:10)",
            url="/orders",
            component="OrderList",
            endpoint="/api/v1/orders/",
            method="GET",
            status_code=500,
            severity=ErrorSeverity.HIGH,
            user=self.admin,
            restaurant=self.restaurant_a,
            correlation_id="corr-a-1",
        )

    def test_unauthenticated_denied(self):
        response = self.client.get(reverse("monitoring_errors"))
        self.assertEqual(response.status_code, 401)

    def test_waiter_lacks_monitoring_view(self):
        response = self.client.get(reverse("monitoring_errors"), **self._auth(self.waiter_token))
        self.assertEqual(response.status_code, 403)

    def test_restaurant_admin_sees_only_own_errors(self):
        ErrorTrackingService.record_frontend(
            message="Error in B", url="/b", component="B",
            severity=ErrorSeverity.LOW, user=self.other_admin, restaurant=self.restaurant_b,
        )
        response = self.client.get(reverse("monitoring_errors"), **self._auth(self.admin_token))
        self.assertEqual(response.status_code, 200)
        ids = [e["id"] for e in response.json()["data"]]
        self.assertEqual(len(ids), 1)
        self.assertEqual(ids[0], str(self.event_a.id))

    def test_manager_sees_own_restaurant_errors(self):
        response = self.client.get(reverse("monitoring_errors"), **self._auth(self.manager_token))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["data"]), 1)

    def test_frontend_error_report_ingestion(self):
        response = self.client.post(
            reverse("monitoring_errors"),
            {
                "message": "Cannot read properties of undefined",
                "stack": "at App.render",
                "url": "/menu",
                "component": "MenuPage",
                "endpoint": "/api/v1/menu/items/",
                "method": "GET",
                "status_code": 500,
                "severity": "MEDIUM",
            },
            content_type="application/json",
            **self._auth(self.manager_token),
        )
        self.assertEqual(response.status_code, 201)
        event = ErrorEvent.objects.filter(message__icontains="Cannot read").first()
        self.assertIsNotNone(event)
        self.assertEqual(event.module, "frontend")

    def test_frontend_report_rejects_unknown_fields(self):
        response = self.client.post(
            reverse("monitoring_errors"),
            {
                "message": "x",
                "stack": "y",
                "url": "/z",
                "component": "C",
                "endpoint": "/e",
                "method": "GET",
                "status_code": 500,
                "severity": "MEDIUM",
                "password": "hunter2",
                "token": "secret",
            },
            content_type="application/json",
            **self._auth(self.manager_token),
        )
        self.assertEqual(response.status_code, 201)
        event = ErrorEvent.objects.get(message="x")
        self.assertNotIn("password", event.metadata)
        self.assertNotIn("token", event.metadata)

    def test_status_update(self):
        response = self.client.patch(
            reverse("monitoring_error_detail", kwargs={"error_id": self.event_a.id}),
            {"status": "RESOLVED"},
            content_type="application/json",
            **self._auth(self.admin_token),
        )
        self.assertEqual(response.status_code, 200)
        self.event_a.refresh_from_db()
        self.assertEqual(self.event_a.status, "RESOLVED")

    def test_other_restaurant_cannot_see_error_detail(self):
        response = self.client.get(
            reverse("monitoring_error_detail", kwargs={"error_id": self.event_a.id}),
            **self._auth(self.other_token),
        )
        self.assertEqual(response.status_code, 404)


class SystemMonitoringAPITests(MonitoringAPITests):
    def test_manager_denied_system_sections(self):
        for name in [
            "monitoring_metrics", "monitoring_jobs", "monitoring_alerts",
            "monitoring_database", "monitoring_integrations", "monitoring_config",
        ]:
            response = self.client.get(reverse(name), **self._auth(self.manager_token))
            self.assertEqual(response.status_code, 403, f"{name} should be denied for MANAGER")

    def test_admin_can_access_system_sections(self):
        for name in [
            "monitoring_metrics", "monitoring_jobs", "monitoring_workflows",
            "monitoring_notifications", "monitoring_database", "monitoring_alerts",
            "monitoring_incidents", "monitoring_slos", "monitoring_config",
        ]:
            response = self.client.get(reverse(name), **self._auth(self.admin_token))
            self.assertEqual(response.status_code, 200, f"{name} should be allowed for RESTAURANT_ADMIN")

    def test_overview_shape(self):
        response = self.client.get(reverse("monitoring_overview"), **self._auth(self.admin_token))
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        for key in ["scope", "version", "uptime_seconds", "requests", "errors", "alerts", "incidents"]:
            self.assertIn(key, data)
        self.assertEqual(data["scope"], "restaurant")

    def test_overview_system_scope_for_superuser(self):
        from rest_framework_simplejwt.tokens import RefreshToken

        superuser = User.objects.create_superuser(
            email="root@monitor.com", password="Password123!"
        )
        token = str(RefreshToken.for_user(superuser).access_token)
        response = self.client.get(reverse("monitoring_overview"), **self._auth(token))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["scope"], "system")

    def test_alert_rule_crud_and_toggle(self):
        create_res = self.client.post(
            reverse("monitoring_alert_rules"),
            {
                "name": "API Error Rate",
                "code": "test.api_error_rate",
                "metric_type": "api_error_rate",
                "operator": "GT",
                "threshold": 5.0,
                "window_minutes": 5,
                "severity": "WARNING",
            },
            content_type="application/json",
            **self._auth(self.admin_token),
        )
        self.assertEqual(create_res.status_code, 201)
        rule_id = create_res.json()["data"]["id"]

        toggle_res = self.client.post(
            reverse("monitoring_alert_rule_toggle", kwargs={"rule_id": rule_id}),
            **self._auth(self.admin_token),
        )
        self.assertEqual(toggle_res.status_code, 200)
        self.assertFalse(toggle_res.json()["data"]["is_active"])

        patch_res = self.client.patch(
            reverse("monitoring_alert_rule_detail", kwargs={"rule_id": rule_id}),
            {"threshold": 10.0},
            content_type="application/json",
            **self._auth(self.admin_token),
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["data"]["threshold"], 10.0)

    def test_config_get_and_patch(self):
        response = self.client.get(reverse("monitoring_config"), **self._auth(self.admin_token))
        self.assertEqual(response.status_code, 200)

        patch_res = self.client.patch(
            reverse("monitoring_config"),
            {"slow_query_threshold_ms": 700, "latency_sample_rate": 0.2},
            content_type="application/json",
            **self._auth(self.admin_token),
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.json()["data"]["slow_query_threshold_ms"], 700)

    def test_manager_can_patch_error_status(self):
        event = ErrorTrackingService.record_frontend(
            message="Manager sees this", url="/x", component="X",
            severity=ErrorSeverity.LOW, user=self.manager, restaurant=self.restaurant_a,
        )
        response = self.client.patch(
            reverse("monitoring_error_detail", kwargs={"error_id": event.id}),
            {"status": "ACKNOWLEDGED"},
            content_type="application/json",
            **self._auth(self.manager_token),
        )
        self.assertEqual(response.status_code, 200)
        event.refresh_from_db()
        self.assertEqual(event.status, "ACKNOWLEDGED")