from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.rbac.models import Role, Permission, TenantMembership
from apps.rbac.services import RBACService
from apps.rbac.serializers import (
    RoleSerializer,
    RoleSummarySerializer,
    PermissionSerializer,
    TenantMembershipSerializer,
    SwitchRoleSerializer,
)

class SwitchActiveRoleView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Switch User Active Role within Restaurant",
        request=SwitchRoleSerializer,
        responses={200: OpenApiResponse(description="Active role switched successfully")},
    )
    def post(self, request):
        serializer = SwitchRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role_identifier = serializer.validated_data.get("role_id") or serializer.validated_data.get("role_code")
        tenant_id = serializer.validated_data.get("tenant_id") or getattr(request, "tenant_id", None)

        membership, active_role, permissions = RBACService.switch_active_role(
            user=request.user,
            role_identifier=role_identifier,
            tenant_id=tenant_id,
        )

        return Response(
            {
                "success": True,
                "data": {
                    "tenant_id": str(membership.tenant_id),
                    "active_role": RoleSummarySerializer(active_role).data,
                    "available_roles": RoleSummarySerializer(membership.assigned_roles.all(), many=True).data,
                    "permissions": sorted(list(permissions)),
                },
            },
            status=status.HTTP_200_OK,
        )

class AuthContextView(APIView):
    """
    Returns full authentication & authorization context for current user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get Current User Authorization Context")
    def get(self, request):
        tenant_id = getattr(request, "tenant_id", None)
        membership = RBACService.get_user_membership(request.user, tenant_id)

        if not membership:
            return Response(
                {
                    "success": True,
                    "data": {
                        "user": {
                            "id": str(request.user.id),
                            "email": request.user.email,
                            "full_name": request.user.full_name,
                        },
                        "membership": None,
                        "active_role": None,
                        "available_roles": [],
                        "permissions": sorted(list(RBACService.get_effective_permissions(request.user, tenant_id))),
                    },
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "success": True,
                "data": {
                    "user": {
                        "id": str(request.user.id),
                        "email": request.user.email,
                        "full_name": request.user.full_name,
                    },
                    "membership": {
                        "id": str(membership.id),
                        "tenant_id": str(membership.tenant_id),
                    },
                    "active_role": RoleSummarySerializer(membership.active_role).data if membership.active_role else None,
                    "available_roles": RoleSummarySerializer(membership.assigned_roles.all(), many=True).data,
                    "permissions": sorted(list(membership.get_effective_permissions())),
                },
            },
            status=status.HTTP_200_OK,
        )

class RoleListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="List Roles")
    def get(self, request):
        tenant_id = getattr(request, "tenant_id", None)
        roles = Role.objects.filter(is_active=True)
        if tenant_id:
            roles = roles.filter(tenant_id__in=[None, tenant_id])
        else:
            roles = roles.filter(tenant_id__isnull=True)

        serializer = RoleSerializer(roles, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

class PermissionListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="List System Permissions")
    def get(self, request):
        permissions = Permission.objects.all()
        serializer = PermissionSerializer(permissions, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)
