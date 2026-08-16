from rest_framework import serializers
from apps.orders.models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "menu_item",
            "item_name_snapshot",
            "unit_price_snapshot",
            "quantity",
            "line_total",
            "notes",
            "created_at",
        ]
        read_only_fields = fields

class OrderSerializer(serializers.ModelSerializer):
    table_name = serializers.CharField(source="table.name", read_only=True, default=None)
    created_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    is_editable = serializers.BooleanField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "table",
            "table_name",
            "created_by",
            "created_by_name",
            "status",
            "status_display",
            "notes",
            "subtotal",
            "total",
            "is_editable",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj) -> str:
        if obj.created_by:
            full_name = getattr(obj.created_by, "full_name", None)
            return full_name if full_name else obj.created_by.email
        return "Unknown"

class OrderItemInputSerializer(serializers.Serializer):
    menu_item_id = serializers.UUIDField(required=True)
    quantity = serializers.IntegerField(required=False, default=1, min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

class OrderCreateSerializer(serializers.Serializer):
    table_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(
        choices=[Order.OrderStatus.DRAFT, Order.OrderStatus.PLACED],
        required=False,
        default=Order.OrderStatus.PLACED
    )
    items = OrderItemInputSerializer(many=True, required=True)

class OrderItemUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(required=False, min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True)
