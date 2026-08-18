from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse


class HealthEndpointTests(TestCase):
    """Public health probes: live, ready, dependencies, composite."""

    def test_liveness_always_200(self):
        response = self.client.get(reverse("health_live"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("HEALTHY", data["data"]["status"].upper())
        self.assertIn("version", data["data"])

    def test_readiness_with_healthy_critical_dependencies(self):
        with patch("redis.from_url") as mock_redis:
            mock_redis.return_value.ping.return_value = True
            response = self.client.get(reverse("health_ready"))
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertTrue(data["data"]["ready"])
            self.assertIn("dependencies", data["data"])
            self.assertIn("postgres", data["data"]["dependencies"])

    def test_dependencies_endpoint_shape(self):
        with patch("redis.from_url") as mock_redis:
            mock_redis.return_value.ping.return_value = True
            response = self.client.get(reverse("health_dependencies"))
            self.assertEqual(response.status_code, 200)
            data = response.json()["data"]
            self.assertIn("dependencies", data)
            for key, dep in data["dependencies"].items():
                self.assertIn("status", dep)
                self.assertNotIn("connection_string", dep)

    def test_dependencies_never_leak_secrets(self):
        response = self.client.get(reverse("health_dependencies"))
        body = response.content.decode()
        self.assertNotIn("fluxiflow_user", body)
        self.assertNotIn("password", body.lower())
        self.assertNotIn("127.0.0.1:5432", body)

    def test_health_composite_backwards_compatible(self):
        with patch("redis.from_url") as mock_redis:
            mock_redis.return_value.ping.return_value = True
            response = self.client.get(reverse("health_check"))
            self.assertIn(response.status_code, [200, 503])
            data = response.json()
            self.assertIn("success", data)
            self.assertIn("service", data["data"])
            self.assertIn("database", data["data"]["dependencies"])
            self.assertIn("redis", data["data"]["dependencies"])