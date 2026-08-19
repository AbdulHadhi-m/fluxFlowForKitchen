from django.urls import path
from apps.rbac.views import (
    SwitchActiveRoleView,
    AuthContextView,
    RoleListView,
    RoleDetailView,
    PermissionListView,
    TenantMembershipListView,
    TenantMembershipRoleAssignmentView,
    RBACSeedView,
)

urlpatterns = [
    path("switch-role/", SwitchActiveRoleView.as_view(), name="rbac_switch_role"),
    path("context/", AuthContextView.as_view(), name="rbac_auth_context"),
    path("roles/", RoleListView.as_view(), name="rbac_roles"),
    path("roles/<uuid:role_id>/", RoleDetailView.as_view(), name="rbac_role_detail"),
    path("permissions/", PermissionListView.as_view(), name="rbac_permissions"),
    path("memberships/", TenantMembershipListView.as_view(), name="rbac_memberships"),
    path("memberships/<uuid:membership_id>/assign/", TenantMembershipRoleAssignmentView.as_view(), name="rbac_membership_assign"),
    path("seed/", RBACSeedView.as_view(), name="rbac_seed"),
]
