from rest_framework import serializers
from apps.menu.models import MenuCategory, MenuItem

class MenuCategorySerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = MenuCategory
        fields = [
            "id",
            "name",
            "description",
            "display_order",
            "is_active",
            "item_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "item_count", "created_at", "updated_at"]

class MenuCategoryCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    display_order = serializers.IntegerField(required=False, default=0)
    is_active = serializers.BooleanField(required=False, default=True)

class MenuCategoryUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    display_order = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)

class MenuItemSerializer(serializers.ModelSerializer):
    category_id = serializers.UUIDField(source="category.id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            "id",
            "category_id",
            "category_name",
            "name",
            "description",
            "price",
            "is_available",
            "is_active",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "category_id", "category_name", "created_at", "updated_at"]

class MenuItemCreateSerializer(serializers.Serializer):
    category_id = serializers.UUIDField(required=True)
    name = serializers.CharField(max_length=200, required=True)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    is_available = serializers.BooleanField(required=False, default=True)
    is_active = serializers.BooleanField(required=False, default=True)
    display_order = serializers.IntegerField(required=False, default=0)

class MenuItemUpdateSerializer(serializers.Serializer):
    category_id = serializers.UUIDField(required=False)
    name = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    is_available = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)
    display_order = serializers.IntegerField(required=False)

class MenuItemAvailabilitySerializer(serializers.Serializer):
    is_available = serializers.BooleanField(required=True)
