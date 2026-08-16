from django.test import TestCase, RequestFactory
from django.http import HttpResponse
from apps.core.middleware import CorrelationIDMiddleware, TenantContextMiddleware

class MiddlewareTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.corr_middleware = CorrelationIDMiddleware(lambda req: HttpResponse("OK"))
        self.tenant_middleware = TenantContextMiddleware(lambda req: HttpResponse("OK"))

    def test_correlation_id_generation_and_header_echo(self):
        """Verify CorrelationIDMiddleware generates a UUID and echoes it in response headers."""
        request = self.factory.get("/")
        response = self.corr_middleware(request)

        self.assertTrue(hasattr(request, "correlation_id"))
        self.assertIn("X-Correlation-ID", response)
        self.assertEqual(response["X-Correlation-ID"], request.correlation_id)

    def test_correlation_id_preservation_from_client_header(self):
        """Verify client-supplied X-Correlation-ID header is preserved."""
        client_id = "client-custom-trace-999"
        request = self.factory.get("/", HTTP_X_CORRELATION_ID=client_id)
        response = self.corr_middleware(request)

        self.assertEqual(request.correlation_id, client_id)
        self.assertEqual(response["X-Correlation-ID"], client_id)

    def test_tenant_context_middleware(self):
        """Verify TenantContextMiddleware parses X-Tenant-ID header."""
        tenant_id = "11111111-2222-3333-4444-555555555555"
        request = self.factory.get("/", HTTP_X_TENANT_ID=tenant_id)
        self.tenant_middleware(request)

        self.assertEqual(request.tenant_id, tenant_id)
