from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
import uuid
import re
from django.db import transaction
from django.shortcuts import get_object_or_404
from apps.rbac.models import Role, Permission, TenantMembership
from apps.rbac.services import RBACService
from apps.rbac.serializers import (
    RoleSerializer,
    RoleSummarySerializer,
    CreateRoleSerializer,
    UpdateRoleSerializer,
    PermissionSerializer,
    TenantMembershipSerializer,
    AssignMembershipRolesSerializer,
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
        roles = Role.objects.filter(is_active=True).prefetch_related("permissions")
        if tenant_id:
            roles = roles.filter(tenant_id__in=[None, tenant_id])

        serializer = RoleSerializer(roles, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Create Custom Dynamic Role", request=CreateRoleSerializer)
    def post(self, request):
        serializer = CreateRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data["name"].strip()
        code = serializer.validated_data.get("code", "").strip()
        if not code:
            code = re.sub(r"[^A-Z0-9_]+", "_", name.upper()).strip("_")
        else:
            code = code.upper()

        description = serializer.validated_data.get("description", "")
        permission_ids = serializer.validated_data.get("permission_ids", [])
        tenant_id = getattr(request, "tenant_id", None)

        with transaction.atomic():
            role = Role.objects.create(
                name=name,
                code=code,
                description=description,
                is_system=False,
                tenant_id=tenant_id,
                is_active=True,
            )

            if permission_ids:
                perms = Permission.objects.filter(id__in=permission_ids) | Permission.objects.filter(code__in=permission_ids)
                role.permissions.set(perms)

        return Response({"success": True, "data": RoleSerializer(role).data}, status=status.HTTP_201_CREATED)


class RoleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get Role Details")
    def get(self, request, role_id):
        role = get_object_or_404(Role, id=role_id)
        return Response({"success": True, "data": RoleSerializer(role).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Update Role and Dynamic Permissions", request=UpdateRoleSerializer)
    def patch(self, request, role_id):
        role = get_object_or_404(Role, id=role_id)
        serializer = UpdateRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            if "name" in serializer.validated_data:
                role.name = serializer.validated_data["name"].strip()
            if "description" in serializer.validated_data:
                role.description = serializer.validated_data["description"].strip()

            if "permission_ids" in serializer.validated_data:
                permission_ids = serializer.validated_data["permission_ids"]
                perms = Permission.objects.filter(id__in=permission_ids) | Permission.objects.filter(code__in=permission_ids)
                role.permissions.set(perms)

            role.save()

        return Response({"success": True, "data": RoleSerializer(role).data}, status=status.HTTP_200_OK)

    @extend_schema(summary="Delete Custom Role")
    def delete(self, request, role_id):
        role = get_object_or_404(Role, id=role_id)
        if role.is_system:
            return Response(
                {"success": False, "error": {"message": "Built-in system roles cannot be deleted."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        role.is_active = False
        role.delete()
        return Response({"success": True, "message": "Role successfully deleted."}, status=status.HTTP_200_OK)


class PermissionListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="List System Permissions")
    def get(self, request):
        permissions = Permission.objects.all().order_by("resource", "action")
        serializer = PermissionSerializer(permissions, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class TenantMembershipListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="List Tenant Staff Memberships and Roles")
    def get(self, request):
        tenant_id = getattr(request, "tenant_id", None)
        memberships = TenantMembership.objects.filter(is_active=True).select_related("user", "active_role").prefetch_related("assigned_roles")
        if tenant_id:
            memberships = memberships.filter(tenant_id=tenant_id)

        serializer = TenantMembershipSerializer(memberships, many=True)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class TenantMembershipRoleAssignmentView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Assign Roles to Staff Membership", request=AssignMembershipRolesSerializer)
    def post(self, request, membership_id):
        membership = get_object_or_404(TenantMembership, id=membership_id)
        serializer = AssignMembershipRolesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assigned_role_ids = serializer.validated_data["assigned_role_ids"]
        active_role_id = serializer.validated_data.get("active_role_id")

        with transaction.atomic():
            roles = Role.objects.filter(id__in=assigned_role_ids, is_active=True) | Role.objects.filter(code__in=assigned_role_ids, is_active=True)
            membership.assigned_roles.set(roles)

            if active_role_id:
                active_role = roles.filter(id=active_role_id).first() or roles.filter(code=active_role_id).first()
                if active_role:
                    membership.active_role = active_role
            elif not membership.active_role or membership.active_role not in roles:
                membership.active_role = roles.first()

            membership.save()

        return Response({"success": True, "data": TenantMembershipSerializer(membership).data}, status=status.HTTP_200_OK)


class RBACSeedView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Re-seed RBAC System Roles and Permissions")
    def post(self, request):
        perms_count, roles_count = RBACService.seed_system_roles_and_permissions()
        return Response(
            {
                "success": True,
                "message": f"Successfully synchronized {perms_count} permissions and {roles_count} system roles.",
            },
            status=status.HTTP_200_OK,
        )

