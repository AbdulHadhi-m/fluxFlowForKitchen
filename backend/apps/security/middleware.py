import uuid
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Adds production-safe security headers to all HTTP responses.
    Headers are environment-aware: strict in production, permissive in development.
    """

    def process_response(self, request, response):
        # X-Content-Type-Options — prevent MIME sniffing
        response["X-Content-Type-Options"] = "nosniff"

        # Referrer-Policy — limit referrer information leakage
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy — restrict browser feature access
        response["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(self), "
            "payment=(), usb=(), magnetometer=(), gyroscope=()"
        )

        # X-Frame-Options — prevent clickjacking (Django default, reinforce here)
        if "X-Frame-Options" not in response:
            response["X-Frame-Options"] = "DENY"

        # Content-Security-Policy — only in non-DEBUG mode to avoid breaking dev tools
        if not settings.DEBUG:
            csp = getattr(settings, "CONTENT_SECURITY_POLICY", None)
            if csp:
                response["Content-Security-Policy"] = csp
            else:
                response["Content-Security-Policy"] = (
                    "default-src 'self'; "
                    "script-src 'self'; "
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                    "font-src 'self' https://fonts.gstatic.com; "
                    "img-src 'self' data: https:; "
                    "connect-src 'self'; "
                    "frame-ancestors 'none'"
                )

        # Cross-Origin headers
        response["Cross-Origin-Opener-Policy"] = "same-origin"

        return response


class SecureTenantContextMiddleware(MiddlewareMixin):
    """
    Derives tenant context from the authenticated user's membership
    instead of blindly trusting the X-Tenant-ID header.
    Falls back to header for unauthenticated requests (public endpoints).
    """

    def process_request(self, request):
        # Default: try header (for backwards compatibility and pre-auth requests)
        header_tenant_id = request.META.get("HTTP_X_TENANT_ID", None)
        request.tenant_id = header_tenant_id

        # After authentication middleware runs, we validate in process_view
        # This is intentionally left lightweight here; the heavy validation
        # is done via IsTenantMember permission class and view-level checks.

    def process_view(self, request, view_func, view_args, view_kwargs):
        """
        If the user is authenticated and has memberships, validate that
        the requested tenant_id is one they actually have access to.
        """
        if not hasattr(request, "user") or not request.user.is_authenticated:
            return None

        header_tenant_id = request.tenant_id
        if not header_tenant_id:
            return None

        # Validate that user actually has membership in this tenant
        from apps.rbac.models import TenantMembership
        has_membership = TenantMembership.objects.filter(
            user=request.user,
            tenant_id=header_tenant_id,
            is_active=True,
        ).exists()

        if not has_membership and not request.user.is_superuser:
            # Clear the tenant context — don't allow spoofing
            request.tenant_id = None

        return None
