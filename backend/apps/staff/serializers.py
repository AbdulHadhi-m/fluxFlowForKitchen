from rest_framework import serializers
from apps.rbac.serializers import RoleSummarySerializer
from apps.staff.models import StaffProfile

class StaffSerializer(serializers.ModelSerializer):
    primary_role = RoleSummarySerializer(read_only=True)
    secondary_roles = RoleSummarySerializer(many=True, read_only=True)
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = StaffProfile
        fields = [
            "id",
            "employee_id",
            "first_name",
            "last_name",
            "display_name",
            "email",
            "phone",
            "primary_role",
            "secondary_roles",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "employee_id", "is_active", "created_at", "updated_at"]

class StaffCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=False, allow_blank=True, default="")
    last_name = serializers.CharField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    primary_role = serializers.CharField(required=True, help_text="Role code or UUID (e.g. WAITER, CASHIER, MANAGER)")
    secondary_roles = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="List of secondary role codes or UUIDs"
    )
    password = serializers.CharField(required=False, write_only=True, allow_blank=True)
    employee_id = serializers.CharField(required=False, allow_blank=True)

class StaffUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    primary_role = serializers.CharField(required=False)
    secondary_roles = serializers.ListField(child=serializers.CharField(), required=False)
    status = serializers.ChoiceField(choices=StaffProfile.StaffStatus.choices, required=False)
