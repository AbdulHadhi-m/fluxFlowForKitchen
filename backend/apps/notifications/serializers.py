from rest_framework import serializers
from apps.notifications.models import Notification, NotificationPreference

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "severity",
            "title",
            "message",
            "is_read",
            "read_at",
            "action_url",
            "entity_type",
            "entity_id",
            "created_at",
        ]
        read_only_fields = fields

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "id",
            "in_app_enabled",
            "realtime_enabled",
            "low_stock_alerts",
            "order_alerts",
            "procurement_alerts",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
