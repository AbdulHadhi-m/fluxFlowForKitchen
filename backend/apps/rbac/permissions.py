from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied, NotAuthenticated
from apps.rbac.services import RBACService

class IsTenantMember(BasePermission):
    """
    Ensures that the authenticated user has an active membership within the current tenant context.
    """
    message = "You do not have an active membership in this restaurant organization."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            raise NotAuthenticated("Authentication credentials were not provided.")

        tenant_id = getattr(request, "tenant_id", None)
        membership = RBACService.get_user_membership(request.user, tenant_id)
        if not membership:
            return False

        # Attach membership and active role to request context for downstream views
        request.membership = membership
        request.active_role = membership.active_role
        return True

class HasActivePermission(BasePermission):
    """
    Enforces that the user's currently active role possesses the required permission code.
    Usage:
        class OrderViewSet(viewsets.ModelViewSet):
            permission_classes = [HasActivePermission("orders.view")]
    """
    required_permission = None

    def __init__(self, required_permission: str = None):
        if required_permission:
            self.required_permission = required_permission

    def __call__(self):
        return self

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            raise NotAuthenticated("Authentication credentials were not provided.")

        if request.user.is_superuser:
            return True

        perm_code = self.required_permission or getattr(view, "required_permission", None)
        if not perm_code:
            return True

        tenant_id = getattr(request, "tenant_id", None)
        effective_permissions = RBACService.get_effective_permissions(request.user, tenant_id)

        if perm_code not in effective_permissions:
            raise PermissionDenied(f"Permission '{perm_code}' is required for this action under your active role.")

        return True

def require_permission(perm_code: str):
    """
    Helper function to instantiate HasActivePermission with a specific code.
    Example: `permission_classes = [require_permission("orders.create")]`
    """
    class DynamicPermission(HasActivePermission):
        required_permission = perm_code

    return DynamicPermission
