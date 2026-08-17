from decimal import Decimal
from rest_framework import serializers
from apps.inventory.models import (
    InventoryItem,
    InventoryBatch,
    StockMovement,
    Recipe,
    RecipeItem,
    StockCount,
    StockCountItem,
    InventoryTransfer,
    InventoryTransferItem,
    WasteRecord,
    UnitOfMeasure,
    ItemType,
    StorageLocation,
    StorageCondition,
)
from apps.inventory.services import RecipeService


class InventoryBatchSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    item_unit = serializers.CharField(source="item.unit", read_only=True)

    class Meta:
        model = InventoryBatch
        fields = [
            "id",
            "item",
            "item_name",
            "item_unit",
            "batch_number",
            "received_date",
            "expiry_date",
            "initial_quantity",
            "current_quantity",
            "unit_cost",
            "supplier_name",
            "storage_location",
            "batch_status",
            "created_at",
        ]
        read_only_fields = ["id", "item_name", "item_unit", "created_at"]


class StockMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    movement_type_display = serializers.CharField(source="get_movement_type_display", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "item",
            "item_name",
            "batch",
            "movement_type",
            "movement_type_display",
            "quantity",
            "quantity_before",
            "quantity_after",
            "unit",
            "unit_cost_snapshot",
            "reference_type",
            "reference_id",
            "reason",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj) -> str:
        if obj.created_by:
            return getattr(obj.created_by, "full_name", None) or obj.created_by.email
        return "System"


class InventoryItemSerializer(serializers.ModelSerializer):
    stock_status = serializers.CharField(read_only=True)
    total_valuation = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "name",
            "sku",
            "item_type",
            "unit",
            "purchase_unit",
            "purchase_to_stock_factor",
            "storage_location",
            "storage_condition",
            "current_quantity",
            "minimum_stock_level",
            "par_level",
            "max_stock_level",
            "cost_per_unit",
            "last_purchase_cost",
            "weighted_average_cost",
            "yield_percentage",
            "track_expiry",
            "track_batch",
            "is_active",
            "stock_status",
            "total_valuation",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "stock_status", "total_valuation", "created_at", "updated_at"]


class CreateInventoryItemSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=True)
    sku = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    item_type = serializers.ChoiceField(choices=ItemType.choices, default=ItemType.RAW_INGREDIENT)
    unit = serializers.ChoiceField(choices=UnitOfMeasure.choices, default=UnitOfMeasure.KG)
    purchase_unit = serializers.ChoiceField(choices=UnitOfMeasure.choices, default=UnitOfMeasure.KG)
    purchase_to_stock_factor = serializers.DecimalField(max_digits=10, decimal_places=4, default=Decimal("1.0000"), required=False)
    storage_location = serializers.ChoiceField(choices=StorageLocation.choices, default=StorageLocation.MAIN_STORE)
    storage_condition = serializers.ChoiceField(choices=StorageCondition.choices, default=StorageCondition.AMBIENT)
    minimum_stock_level = serializers.DecimalField(max_digits=12, decimal_places=3, default=Decimal("5.000"), required=False)
    par_level = serializers.DecimalField(max_digits=12, decimal_places=3, default=Decimal("10.000"), required=False)
    max_stock_level = serializers.DecimalField(max_digits=12, decimal_places=3, default=Decimal("100.000"), required=False)
    cost_per_unit = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), required=False)
    initial_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, default=Decimal("0.000"), required=False)
    yield_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal("100.00"), required=False)
    track_expiry = serializers.BooleanField(default=False, required=False)
    track_batch = serializers.BooleanField(default=False, required=False)


class ReceiveStockSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"), required=True)
    unit = serializers.ChoiceField(choices=UnitOfMeasure.choices, required=True)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=4, default=Decimal("0.0000"), required=False)
    batch_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    expiry_date = serializers.DateField(required=False, allow_null=True, default=None)
    supplier_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    reference = serializers.CharField(max_length=128, required=False, allow_blank=True, default="")
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class AdjustStockSerializer(serializers.Serializer):
    delta_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, required=True)
    reason = serializers.CharField(max_length=255, required=True)


class RecipeItemSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.CharField(source="inventory_item.name", read_only=True, default="")
    sub_recipe_name = serializers.CharField(source="sub_recipe.name", read_only=True, default="")

    class Meta:
        model = RecipeItem
        fields = [
            "id",
            "inventory_item",
            "inventory_item_name",
            "sub_recipe",
            "sub_recipe_name",
            "quantity",
            "unit",
            "preparation_notes",
        ]
        read_only_fields = ["id", "inventory_item_name", "sub_recipe_name"]


class RecipeSerializer(serializers.ModelSerializer):
    ingredients = RecipeItemSerializer(many=True, read_only=True)
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True, default="")
    calculated_cost = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = [
            "id",
            "name",
            "version",
            "status",
            "recipe_type",
            "menu_item",
            "menu_item_name",
            "output_quantity",
            "output_unit",
            "yield_percentage",
            "preparation_loss_pct",
            "cooking_loss_pct",
            "effective_from",
            "effective_until",
            "instructions",
            "notes",
            "calculated_cost",
            "ingredients",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "menu_item_name", "calculated_cost", "created_at", "updated_at"]

    def get_calculated_cost(self, obj) -> str:
        try:
            return str(RecipeService.calculate_recipe_cost(obj))
        except Exception:
            return "0.00"


class RecipeItemInputSerializer(serializers.Serializer):
    inventory_item_id = serializers.UUIDField(required=False, allow_null=True)
    sub_recipe_id = serializers.UUIDField(required=False, allow_null=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))
    unit = serializers.ChoiceField(choices=UnitOfMeasure.choices)
    preparation_notes = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class RecipeCreateUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    recipe_type = serializers.ChoiceField(choices=Recipe.RecipeType.choices, default=Recipe.RecipeType.MENU_ITEM_RECIPE)
    menu_item_id = serializers.UUIDField(required=False, allow_null=True)
    output_quantity = serializers.DecimalField(max_digits=10, decimal_places=3, default=Decimal("1.000"), required=False)
    output_unit = serializers.ChoiceField(choices=UnitOfMeasure.choices, default=UnitOfMeasure.PORTION)
    yield_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal("100.00"), required=False)
    preparation_loss_pct = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"), required=False)
    cooking_loss_pct = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"), required=False)
    instructions = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    ingredients = RecipeItemInputSerializer(many=True, required=False, default=[])


class WasteRecordSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    reported_by_name = serializers.SerializerMethodField()

    class Meta:
        model = WasteRecord
        fields = [
            "id",
            "item",
            "item_name",
            "batch",
            "quantity",
            "unit",
            "reason",
            "unit_cost",
            "total_loss_cost",
            "location",
            "reported_by_name",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "item_name", "total_loss_cost", "reported_by_name", "created_at"]

    def get_reported_by_name(self, obj) -> str:
        if obj.reported_by:
            return getattr(obj.reported_by, "full_name", None) or obj.reported_by.email
        return "System"


class CreateWasteSerializer(serializers.Serializer):
    item_id = serializers.UUIDField(required=True)
    batch_id = serializers.UUIDField(required=False, allow_null=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))
    reason = serializers.ChoiceField(choices=WasteRecord.WasteReason.choices, default=WasteRecord.WasteReason.SPOILAGE)
    location = serializers.ChoiceField(choices=StorageLocation.choices, default=StorageLocation.KITCHEN)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class StockCountItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    item_unit = serializers.CharField(source="item.unit", read_only=True)

    class Meta:
        model = StockCountItem
        fields = [
            "id",
            "item",
            "item_name",
            "item_unit",
            "system_quantity",
            "counted_quantity",
            "variance_quantity",
            "unit_cost",
            "variance_value",
            "notes",
        ]
        read_only_fields = ["id", "item_name", "item_unit", "variance_quantity", "variance_value"]


class StockCountSerializer(serializers.ModelSerializer):
    items = StockCountItemSerializer(many=True, read_only=True)
    counted_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StockCount
        fields = [
            "id",
            "count_number",
            "status",
            "location",
            "category",
            "counted_by_name",
            "approved_by_name",
            "counted_at",
            "approved_at",
            "notes",
            "items",
            "created_at",
        ]
        read_only_fields = ["id", "count_number", "counted_by_name", "approved_by_name", "created_at"]

    def get_counted_by_name(self, obj) -> str:
        if obj.counted_by:
            return getattr(obj.counted_by, "full_name", None) or obj.counted_by.email
        return ""

    def get_approved_by_name(self, obj) -> str:
        if obj.approved_by:
            return getattr(obj.approved_by, "full_name", None) or obj.approved_by.email
        return ""


class StockCountItemUpdateEntrySerializer(serializers.Serializer):
    item_id = serializers.UUIDField(required=True)
    counted_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.000"))
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class InventoryTransferItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = InventoryTransferItem
        fields = [
            "id",
            "item",
            "item_name",
            "quantity",
            "unit",
            "notes",
        ]
        read_only_fields = ["id", "item_name"]


class InventoryTransferSerializer(serializers.ModelSerializer):
    items = InventoryTransferItemSerializer(many=True, read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InventoryTransfer
        fields = [
            "id",
            "transfer_number",
            "source_location",
            "destination_location",
            "status",
            "requested_by_name",
            "approved_by_name",
            "received_by_name",
            "requested_at",
            "approved_at",
            "received_at",
            "notes",
            "items",
            "created_at",
        ]
        read_only_fields = ["id", "transfer_number", "requested_by_name", "approved_by_name", "received_by_name", "created_at"]

    def get_requested_by_name(self, obj) -> str:
        return getattr(obj.requested_by, "full_name", None) or obj.requested_by.email if obj.requested_by else ""

    def get_approved_by_name(self, obj) -> str:
        return getattr(obj.approved_by, "full_name", None) or obj.approved_by.email if obj.approved_by else ""

    def get_received_by_name(self, obj) -> str:
        return getattr(obj.received_by, "full_name", None) or obj.received_by.email if obj.received_by else ""
