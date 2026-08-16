from rest_framework import serializers
from apps.rbac.models import Permission, Role, TenantMembership

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "resource", "action", "code", "description"]

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = ["id", "name", "code", "description", "is_system", "tenant_id", "permissions"]

class RoleSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "code", "description", "is_system"]

class TenantMembershipSerializer(serializers.ModelSerializer):
    active_role = RoleSummarySerializer(read_only=True)
    assigned_roles = RoleSummarySerializer(many=True, read_only=True)
    effective_permissions = serializers.SerializerMethodField()

    class Meta:
        model = TenantMembership
        fields = [
            "id",
            "tenant_id",
            "active_role",
            "assigned_roles",
            "effective_permissions",
            "is_active",
            "created_at",
        ]

    def get_effective_permissions(self, obj) -> list[str]:
        return sorted(list(obj.get_effective_permissions()))

class SwitchRoleSerializer(serializers.Serializer):
    role_id = serializers.CharField(required=False, allow_blank=True)
    role_code = serializers.CharField(required=False, allow_blank=True)
    tenant_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        if not data.get("role_id") and not data.get("role_code"):
            raise serializers.ValidationError("Either 'role_id' or 'role_code' must be provided.")
        return data
