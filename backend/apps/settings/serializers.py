from rest_framework import serializers
from apps.settings.models import RestaurantConfiguration, UserPreference
from apps.restaurants.serializers import RestaurantSerializer, BusinessHourSerializer
from apps.restaurants.models import Restaurant, BusinessHour

class RestaurantConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantConfiguration
        fields = [
            "id",
            "allow_order_cancellation",
            "cancellation_window_minutes",
            "require_order_confirmation",
            "allow_table_orders",
            "allow_takeaway",
            "default_prep_time_minutes",
            "kds_warning_threshold_minutes",
            "kds_critical_threshold_minutes",
            "auto_refresh_interval_seconds",
            "tax_enabled",
            "default_tax_rate",
            "tax_name",
            "tax_registration_number",
            "tax_inclusive_pricing",
            "invoice_prefix",
            "receipt_prefix",
            "invoice_footer_notes",
            "allow_negative_stock",
            "require_wastage_reason",
            "low_stock_threshold_default",
            "po_approval_required",
            "po_approval_threshold",
            "default_delivery_lead_days",
            "inventory_alerts_enabled",
            "order_alerts_enabled",
            "procurement_alerts_enabled",
        ]
        read_only_fields = ["id"]


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = [
            "id",
            "theme",
            "time_format",
            "date_format",
            "table_density",
        ]
        read_only_fields = ["id"]


class CompleteRestaurantSettingsSerializer(serializers.Serializer):
    profile = RestaurantSerializer(read_only=True)
    business_hours = BusinessHourSerializer(many=True, read_only=True)
    configuration = RestaurantConfigurationSerializer(read_only=True)
