import uuid
import contextvars
from django.utils.deprecation import MiddlewareMixin

# Thread-safe ContextVar for correlation ID in logging
correlation_id_ctx = contextvars.ContextVar("correlation_id", default="")
tenant_id_ctx = contextvars.ContextVar("tenant_id", default="")

class CorrelationIDMiddleware(MiddlewareMixin):
    """
    Middleware that ensures every incoming request has a unique Correlation ID.
    Attaches the correlation ID to the request object and the response headers.
    """
    CORRELATION_ID_HEADER = "HTTP_X_CORRELATION_ID"
    RESPONSE_HEADER = "X-Correlation-ID"

    def process_request(self, request):
        correlation_id = request.META.get(self.CORRELATION_ID_HEADER) or str(uuid.uuid4())
        request.correlation_id = correlation_id
        correlation_id_ctx.set(correlation_id)

    def process_response(self, request, response):
        correlation_id = getattr(request, "correlation_id", None)
        if correlation_id:
            response[self.RESPONSE_HEADER] = correlation_id
        return response

class TenantContextMiddleware(MiddlewareMixin):
    """
    Middleware establishing tenant context foundation on incoming requests.
    Prepares request.tenant_id for downstream viewsets and services.
    """
    def process_request(self, request):
        # In this foundation phase, check header or initialize as None
        # Future auth middleware will extract from authenticated user/JWT claims
        tenant_id = request.META.get("HTTP_X_TENANT_ID", None)
        request.tenant_id = tenant_id
        tenant_id_ctx.set(tenant_id or "")

    def process_response(self, request, response):
        return response
