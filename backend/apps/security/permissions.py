from django.utils import timezone
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied

from apps.security.services import MFAService, StepUpAuthService


class RequireRecentAuth(BasePermission):
    """
    Permission class requiring recent authentication (step-up auth)
    for sensitive operations. Use on views that modify security settings,
    financial configurations, or privileged role assignments.

    Usage:
        class ChangeBankDetailsView(APIView):
            permission_classes = [IsAuthenticated, RequireRecentAuth]
    """
    message = "This action requires recent authentication. Please re-authenticate to proceed."
    window_minutes = 15

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if StepUpAuthService.has_recent_auth(request.user, self.window_minutes):
            return True

        raise PermissionDenied(self.message)


class RequireMFA(BasePermission):
    """
    Permission class that requires active MFA for the requesting user.
    Use on views requiring MFA-protected access.

    Usage:
        class SensitiveConfigView(APIView):
            permission_classes = [IsAuthenticated, RequireMFA]
    """
    message = "This action requires multi-factor authentication to be enabled on your account."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        if MFAService.user_has_mfa(request.user):
            return True

        raise PermissionDenied(self.message)
