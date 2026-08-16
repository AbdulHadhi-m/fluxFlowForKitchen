from django.urls import path
from apps.rbac.views import (
    SwitchActiveRoleView,
    AuthContextView,
    RoleListView,
    PermissionListView,
)

urlpatterns = [
    path("switch-role/", SwitchActiveRoleView.as_view(), name="rbac_switch_role"),
    path("context/", AuthContextView.as_view(), name="rbac_auth_context"),
    path("roles/", RoleListView.as_view(), name="rbac_roles"),
    path("permissions/", PermissionListView.as_view(), name="rbac_permissions"),
]
