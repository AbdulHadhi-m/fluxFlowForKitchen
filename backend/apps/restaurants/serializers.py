from rest_framework import serializers
from apps.restaurants.models import Restaurant, BusinessHour

class BusinessHourSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = BusinessHour
        fields = [
            "id",
            "day_of_week",
            "day_name",
            "opening_time",
            "closing_time",
            "is_closed",
            "is_overnight",
        ]

    def validate(self, data):
        is_closed = data.get("is_closed", False)
        opening = data.get("opening_time")
        closing = data.get("closing_time")
        is_overnight = data.get("is_overnight", False)

        if not is_closed:
            if not opening or not closing:
                raise serializers.ValidationError("Opening and closing times are required when not closed.")
            if not is_overnight and opening >= closing:
                raise serializers.ValidationError("Closing time must be after opening time (or marked as overnight).")
        return data

class RestaurantSerializer(serializers.ModelSerializer):
    business_hours = BusinessHourSerializer(many=True, read_only=True)

    class Meta:
        model = Restaurant
        fields = [
            "id",
            "name",
            "legal_name",
            "slug",
            "phone",
            "email",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "timezone",
            "currency",
            "is_active",
            "business_hours",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

class RestaurantCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = [
            "name",
            "legal_name",
            "phone",
            "email",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "timezone",
            "currency",
        ]

class RestaurantUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = [
            "name",
            "legal_name",
            "phone",
            "email",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "timezone",
            "currency",
            "is_active",
        ]
