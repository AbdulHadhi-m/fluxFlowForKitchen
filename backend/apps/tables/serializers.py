from rest_framework import serializers
from apps.tables.models import RestaurantTable

class TableSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = RestaurantTable
        fields = [
            "id",
            "name",
            "capacity",
            "section",
            "status",
            "status_display",
            "is_active",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status_display", "created_at", "updated_at"]

class TableCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50, required=True, help_text="e.g. T01, Table 12, VIP-1")
    capacity = serializers.IntegerField(required=False, default=4, min_value=1)
    section = serializers.CharField(max_length=100, required=False, allow_blank=True, default="Main Dining")
    display_order = serializers.IntegerField(required=False, default=0, min_value=0)
    is_active = serializers.BooleanField(required=False, default=True)

class TableUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50, required=False)
    capacity = serializers.IntegerField(required=False, min_value=1)
    section = serializers.CharField(max_length=100, required=False, allow_blank=True)
    display_order = serializers.IntegerField(required=False, min_value=0)
    is_active = serializers.BooleanField(required=False)

class TableStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=RestaurantTable.TableStatus.choices, required=True)
