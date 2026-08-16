from django.test import TestCase
from django.urls import reverse
from unittest.mock import patch

class HealthCheckAPITests(TestCase):
    def test_health_check_endpoint_structure(self):
        """Verify the /api/v1/health/ endpoint returns the expected JSON response shape."""
        # Mock database connection and Redis ping to ensure deterministic unit test
        with patch("redis.from_url") as mock_redis:
            mock_redis.return_value.ping.return_value = True
            response = self.client.get(reverse("health_check"))
            self.assertIn(response.status_code, [200, 503])
            data = response.json()
            self.assertIn("success", data)
            self.assertIn("data", data)
            self.assertIn("service", data["data"])
            self.assertIn("dependencies", data["data"])
            self.assertIn("database", data["data"]["dependencies"])
            self.assertIn("redis", data["data"]["dependencies"])
