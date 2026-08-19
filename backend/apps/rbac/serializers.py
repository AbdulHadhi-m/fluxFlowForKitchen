from rest_framework import serializers
from apps.accounts.models import User
from apps.rbac.models import Permission, Role, TenantMembership

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "resource", "action", "code", "description"]

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_system",
            "tenant_id",
            "permissions",
            "permission_count",
            "created_at",
            "updated_at",
        ]

    def get_permission_count(self, obj) -> int:
        return obj.permissions.count()

class RoleSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "code", "description", "is_system"]

class CreateRoleSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=True)
    code = serializers.CharField(max_length=64, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    permission_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)

class UpdateRoleSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    permission_ids = serializers.ListField(child=serializers.CharField(), required=False)

class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name"]

class TenantMembershipSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    active_role = RoleSummarySerializer(read_only=True)
    assigned_roles = RoleSummarySerializer(many=True, read_only=True)
    effective_permissions = serializers.SerializerMethodField()

    class Meta:
        model = TenantMembership
        fields = [
            "id",
            "user",
            "tenant_id",
            "active_role",
            "assigned_roles",
            "effective_permissions",
            "is_active",
            "created_at",
        ]

    def get_effective_permissions(self, obj) -> list[str]:
        return sorted(list(obj.get_effective_permissions()))

class AssignMembershipRolesSerializer(serializers.Serializer):
    assigned_role_ids = serializers.ListField(child=serializers.CharField(), required=True)
    active_role_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)

class SwitchRoleSerializer(serializers.Serializer):
    role_id = serializers.CharField(required=False, allow_blank=True)
    role_code = serializers.CharField(required=False, allow_blank=True)
    tenant_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        if not data.get("role_id") and not data.get("role_code"):
            raise serializers.ValidationError("Either 'role_id' or 'role_code' must be provided.")
        return data

