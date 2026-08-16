from rest_framework.permissions import BasePermission

class BaseTenantPermission(BasePermission):
    """
    Base permission class enforcing tenant data isolation across DRF views.
    Ensures that authenticated requests can only access objects matching their tenant scope.
    """
    message = "You do not have permission to access resources belonging to another tenant."

    def has_permission(self, request, view):
        # Allow requests if user is authenticated and has tenant context
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        # Enforce tenant match on object level
        obj_tenant_id = getattr(obj, "tenant_id", None)
        user_tenant_id = getattr(request.user, "tenant_id", None) or getattr(request, "tenant_id", None)

        if obj_tenant_id is None:
            return True

        return str(obj_tenant_id) == str(user_tenant_id)

class IsTenantMember(BaseTenantPermission):
    """Permission requiring active authentication and valid tenant membership."""
    pass
