from rest_framework import serializers
from apps.restaurants.models import Restaurant
from apps.menu.models import MenuItem, MenuCategory
from apps.tables.models import RestaurantTable
from apps.orders.models import Order
from apps.customers.models import Customer


class PublicRestaurantSerializer(serializers.ModelSerializer):
    cover_image_url = serializers.CharField(source="operational_settings.cover_image_url", default="")
    tagline = serializers.CharField(source="operational_settings.tagline", default="")
    online_ordering_enabled = serializers.BooleanField(source="operational_settings.online_ordering_enabled", default=True)
    qr_ordering_enabled = serializers.BooleanField(source="operational_settings.qr_ordering_enabled", default=True)
    takeaway_ordering_enabled = serializers.BooleanField(source="operational_settings.takeaway_ordering_enabled", default=True)
    guest_checkout_enabled = serializers.BooleanField(source="operational_settings.guest_checkout_enabled", default=True)
    min_online_order_amount = serializers.DecimalField(
        source="operational_settings.min_online_order_amount", max_digits=10, decimal_places=2, default="0.00"
    )
    is_open = serializers.BooleanField(read_only=True, default=True)

    class Meta:
        model = Restaurant
        fields = [
            "id",
            "name",
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
            "cover_image_url",
            "tagline",
            "online_ordering_enabled",
            "qr_ordering_enabled",
            "takeaway_ordering_enabled",
            "guest_checkout_enabled",
            "min_online_order_amount",
            "is_open",
        ]


class PublicMenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = [
            "id",
            "name",
            "description",
            "price",
            "is_available",
            "category_id",
            "display_order",
        ]


class PublicMenuCategorySerializer(serializers.ModelSerializer):
    items = PublicMenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = MenuCategory
        fields = [
            "id",
            "name",
            "description",
            "display_order",
            "items",
        ]


class CartItemInputSerializer(serializers.Serializer):
    menu_item_id = serializers.UUIDField(required=True)
    quantity = serializers.IntegerField(min_value=1, default=1)
    notes = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")


class CartValidateSerializer(serializers.Serializer):
    restaurant_slug = serializers.CharField(required=True)
    items = CartItemInputSerializer(many=True, required=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True, default="")
    order_type = serializers.ChoiceField(
        choices=["DINE_IN", "TAKEAWAY", "DELIVERY"], default="DINE_IN"
    )
    table_id = serializers.UUIDField(required=False, allow_null=True)


class GuestInfoSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")


class OnlineCheckoutSerializer(serializers.Serializer):
    restaurant_slug = serializers.CharField(required=True)
    items = CartItemInputSerializer(many=True, required=True)
    order_type = serializers.ChoiceField(
        choices=["DINE_IN", "TAKEAWAY", "DELIVERY"], default="DINE_IN"
    )
    table_id = serializers.UUIDField(required=False, allow_null=True)
    qr_token = serializers.CharField(required=False, allow_blank=True, default="")
    coupon_code = serializers.CharField(required=False, allow_blank=True, default="")
    guest_info = GuestInfoSerializer(required=False, default=dict)
    payment_method = serializers.ChoiceField(
        choices=["PAY_AT_COUNTER", "ONLINE_CARD", "CASH"], default="PAY_AT_COUNTER"
    )
    special_instructions = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    pickup_time = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")


class CustomerRegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, required=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(max_length=30, required=True)
    password = serializers.CharField(min_length=6, write_only=True, required=True)
    restaurant_slug = serializers.CharField(required=True)


class CustomerLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    restaurant_slug = serializers.CharField(required=True)
