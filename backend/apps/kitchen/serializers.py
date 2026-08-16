from rest_framework import serializers
from apps.orders.models import OrderItem
from apps.kitchen.models import KitchenTicket

class KitchenOrderItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="item_name_snapshot", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "name",
            "quantity",
            "notes",
        ]
        read_only_fields = fields

class KitchenTicketSerializer(serializers.ModelSerializer):
    order_id = serializers.UUIDField(source="order.id", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    table_name = serializers.CharField(source="order.table.name", read_only=True, default=None)
    server_name = serializers.SerializerMethodField()
    notes = serializers.CharField(source="order.notes", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = KitchenTicket
        fields = [
            "id",
            "order_id",
            "order_number",
            "table_name",
            "server_name",
            "status",
            "status_display",
            "priority",
            "notes",
            "items",
            "started_at",
            "ready_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_server_name(self, obj) -> str:
        if obj.order.created_by:
            full_name = getattr(obj.order.created_by, "full_name", None)
            return full_name if full_name else obj.order.created_by.email
        return "Unknown"

    def get_items(self, obj):
        order_items = obj.order.items.all()
        return KitchenOrderItemSerializer(order_items, many=True).data
