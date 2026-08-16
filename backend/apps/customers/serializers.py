from rest_framework import serializers
from apps.customers.models import (
    Customer,
    CustomerTag,
    CustomerVisit,
    Reservation,
    ReservationStatus,
)
from apps.tables.serializers import TableSerializer

class CustomerTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerTag
        fields = ["id", "name", "color", "created_at"]
        read_only_fields = ["id", "created_at"]


class CustomerSerializer(serializers.ModelSerializer):
    tags = CustomerTagSerializer(many=True, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "email",
            "date_of_birth",
            "gender",
            "preferred_table",
            "dietary_preferences",
            "allergies",
            "tags",
            "tag_ids",
            "internal_notes",
            "total_visits",
            "total_spend",
            "last_visit_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "full_name",
            "total_visits",
            "total_spend",
            "last_visit_at",
            "created_at",
            "updated_at",
        ]


class CustomerVisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerVisit
        fields = [
            "id",
            "customer",
            "table",
            "order_id",
            "party_size",
            "spend_amount",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ReservationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    table_name = serializers.CharField(source="table.name", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "reservation_number",
            "customer",
            "customer_name",
            "customer_phone",
            "table",
            "table_name",
            "reservation_date",
            "reservation_time",
            "party_size",
            "status",
            "special_requests",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "reservation_number", "created_at", "updated_at"]
