from decimal import Decimal
from rest_framework import serializers
from apps.inventory.models import (
    InventoryItem,
    StockMovement,
    Recipe,
    RecipeItem,
    UnitOfMeasure,
)

class StockMovementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    movement_type_display = serializers.CharField(source="get_movement_type_display", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "movement_type",
            "movement_type_display",
            "quantity",
            "quantity_before",
            "quantity_after",
            "unit",
            "reference_type",
            "reference_id",
            "reason",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj) -> str:
        if obj.created_by:
            full_name = getattr(obj.created_by, "full_name", None)
            return full_name if full_name else obj.created_by.email
        return "System"

class InventoryItemSerializer(serializers.ModelSerializer):
    stock_status = serializers.CharField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "name",
            "sku",
            "unit",
            "current_quantity",
            "minimum_stock_level",
            "cost_per_unit",
            "is_active",
            "stock_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "stock_status", "created_at", "updated_at"]

class CreateInventoryItemSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=True)
    sku = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    unit = serializers.ChoiceField(choices=UnitOfMeasure.choices, default=UnitOfMeasure.KG)
    minimum_stock_level = serializers.DecimalField(max_digits=12, decimal_places=3, default=Decimal("5.000"), required=False)
    cost_per_unit = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), required=False)
    initial_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, default=Decimal("0.000"), required=False)

class ReceiveStockSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"), required=True)
    unit = serializers.ChoiceField(choices=UnitOfMeasure.choices, required=True)
    reference = serializers.CharField(max_length=128, required=False, allow_blank=True, default="")
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")

class AdjustStockSerializer(serializers.Serializer):
    delta_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, required=True)
    reason = serializers.CharField(max_length=255, required=True)

class WastageSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"), required=True)
    reason = serializers.CharField(max_length=255, required=False, default="Spoiled / Expired")

class RecipeItemSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.CharField(source="inventory_item.name", read_only=True)

    class Meta:
        model = RecipeItem
        fields = [
            "id",
            "inventory_item",
            "inventory_item_name",
            "quantity",
            "unit",
        ]
        read_only_fields = ["id", "inventory_item_name"]

class RecipeSerializer(serializers.ModelSerializer):
    ingredients = RecipeItemSerializer(many=True, read_only=True)
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)

    class Meta:
        model = Recipe
        fields = [
            "id",
            "menu_item",
            "menu_item_name",
            "yield_quantity",
            "instructions",
            "ingredients",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "menu_item_name", "created_at", "updated_at"]
