from rest_framework import serializers
from apps.audit.models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source="get_action_display", read_only=True)
    entity_type_display = serializers.CharField(source="get_entity_type_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor_email",
            "actor_role",
            "actor_type",
            "action",
            "action_display",
            "entity_type",
            "entity_type_display",
            "entity_id",
            "description",
            "before_data",
            "after_data",
            "metadata",
            "ip_address",
            "user_agent",
            "correlation_id",
            "created_at",
        ]
        read_only_fields = fields
