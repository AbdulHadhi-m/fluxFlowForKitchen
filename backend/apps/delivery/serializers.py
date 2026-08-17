from decimal import Decimal
from rest_framework import serializers
from apps.delivery.models import (
    CustomerAddress,
    DeliveryZone,
    DeliveryDriver,
    Delivery,
    DeliveryEvent,
)


class CustomerAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerAddress
        fields = [
            "id",
            "customer",
            "label",
            "recipient_name",
            "phone",
            "address_line_1",
            "address_line_2",
            "landmark",
            "city",
            "state",
            "postal_code",
            "latitude",
            "longitude",
            "is_default",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "customer", "created_at", "updated_at"]


class DeliveryZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = [
            "id",
            "restaurant",
            "name",
            "description",
            "postal_codes",
            "fee",
            "minimum_order",
            "maximum_order",
            "estimated_minutes",
            "priority",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "restaurant", "created_at", "updated_at"]


class DeliveryDriverSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    employee_id = serializers.CharField(source="staff_profile.employee_id", read_only=True)
    email = serializers.CharField(source="staff_profile.email", read_only=True)

    class Meta:
        model = DeliveryDriver
        fields = [
            "id",
            "restaurant",
            "staff_profile",
            "full_name",
            "employee_id",
            "email",
            "vehicle_type",
            "vehicle_number",
            "phone",
            "availability_status",
            "active_deliveries_count",
            "total_completed_deliveries",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "restaurant",
            "active_deliveries_count",
            "total_completed_deliveries",
            "created_at",
            "updated_at",
        ]


class DeliveryEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryEvent
        fields = [
            "id",
            "event_type",
            "actor",
            "actor_name",
            "notes",
            "metadata",
            "created_at",
        ]

    def get_actor_name(self, obj) -> str:
        if obj.actor:
            return obj.actor.full_name or obj.actor.email
        return "System"


class DeliveryListSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    order_total = serializers.DecimalField(source="order.total", max_digits=12, decimal_places=2, read_only=True)
    zone_name = serializers.CharField(source="zone.name", read_only=True, default="")
    driver_name = serializers.CharField(source="assigned_driver.full_name", read_only=True, default="")

    class Meta:
        model = Delivery
        fields = [
            "id",
            "order",
            "order_number",
            "order_total",
            "status",
            "recipient_name",
            "recipient_phone",
            "address_line_1",
            "city",
            "postal_code",
            "zone",
            "zone_name",
            "assigned_driver",
            "driver_name",
            "delivery_fee",
            "estimated_delivery_at",
            "assigned_at",
            "picked_up_at",
            "delivered_at",
            "created_at",
        ]


class DeliveryDetailSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    order_total = serializers.DecimalField(source="order.total", max_digits=12, decimal_places=2, read_only=True)
    order_subtotal = serializers.DecimalField(source="order.subtotal", max_digits=12, decimal_places=2, read_only=True)
    order_items = serializers.SerializerMethodField()
    zone_name = serializers.CharField(source="zone.name", read_only=True, default="")
    driver = DeliveryDriverSerializer(source="assigned_driver", read_only=True)
    events = DeliveryEventSerializer(many=True, read_only=True)

    class Meta:
        model = Delivery
        fields = [
            "id",
            "restaurant",
            "order",
            "order_number",
            "order_subtotal",
            "order_total",
            "order_items",
            "customer",
            "zone",
            "zone_name",
            "assigned_driver",
            "driver",
            "status",
            "recipient_name",
            "recipient_phone",
            "address_line_1",
            "address_line_2",
            "landmark",
            "city",
            "state",
            "postal_code",
            "delivery_instructions",
            "delivery_fee",
            "delivery_pin",
            "estimated_delivery_at",
            "assigned_at",
            "picked_up_at",
            "delivered_at",
            "cancelled_at",
            "failed_at",
            "failure_reason",
            "events",
            "created_at",
            "updated_at",
        ]

    def get_order_items(self, obj):
        return [
            {
                "name": item.item_name,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price),
                "total_price": str(item.total_price),
                "notes": item.special_notes,
            }
            for item in obj.order.items.all()
        ]


class AssignDriverRequestSerializer(serializers.Serializer):
    driver_id = serializers.UUIDField(required=True)


class DeliveryFailRequestSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, min_length=3)


class DriverAvailabilityUpdateSerializer(serializers.Serializer):
    availability_status = serializers.ChoiceField(
        choices=DeliveryDriver.AvailabilityStatus.choices, required=True
    )


class DeliveryEstimateRequestSerializer(serializers.Serializer):
    postal_code = serializers.CharField(required=True, max_length=20)
    subtotal = serializers.DecimalField(required=False, default=Decimal("0.00"), max_digits=10, decimal_places=2)
