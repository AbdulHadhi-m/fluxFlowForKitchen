from decimal import Decimal
from rest_framework import serializers
from apps.procurement.models import (
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseReceipt,
    PurchaseReceiptItem,
)
from apps.inventory.models import UnitOfMeasure

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "supplier_code",
            "name",
            "contact_person",
            "email",
            "phone",
            "address",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "supplier_code", "created_at", "updated_at"]

class CreateSupplierSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=True)
    contact_person = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    address = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    remaining_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "id",
            "inventory_item",
            "item_name_snapshot",
            "quantity_ordered",
            "quantity_received",
            "remaining_quantity",
            "unit",
            "unit_cost",
            "line_total",
        ]
        read_only_fields = fields

class PurchaseReceiptItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="purchase_order_item.item_name_snapshot", read_only=True)

    class Meta:
        model = PurchaseReceiptItem
        fields = [
            "id",
            "purchase_order_item",
            "item_name",
            "quantity_received",
            "unit",
        ]
        read_only_fields = fields

class PurchaseReceiptSerializer(serializers.ModelSerializer):
    items = PurchaseReceiptItemSerializer(many=True, read_only=True)
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseReceipt
        fields = [
            "id",
            "receipt_number",
            "purchase_order",
            "received_by_name",
            "idempotency_key",
            "notes",
            "items",
            "created_at",
        ]
        read_only_fields = fields

    def get_received_by_name(self, obj) -> str:
        if obj.received_by:
            return getattr(obj.received_by, "full_name", None) or obj.received_by.email
        return "System"

class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    receipts = PurchaseReceiptSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_code = serializers.CharField(source="supplier.supplier_code", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "po_number",
            "supplier",
            "supplier_name",
            "supplier_code",
            "status",
            "status_display",
            "order_date",
            "expected_delivery_date",
            "subtotal",
            "tax_amount",
            "total_amount",
            "notes",
            "created_by_name",
            "approved_by_name",
            "approved_at",
            "items",
            "receipts",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj) -> str:
        if obj.created_by:
            return getattr(obj.created_by, "full_name", None) or obj.created_by.email
        return "System"

    def get_approved_by_name(self, obj) -> str:
        if obj.approved_by:
            return getattr(obj.approved_by, "full_name", None) or obj.approved_by.email
        return None

class CreatePurchaseOrderItemInputSerializer(serializers.Serializer):
    inventory_item_id = serializers.UUIDField(required=True)
    quantity_ordered = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"), required=True)
    unit = serializers.ChoiceField(choices=UnitOfMeasure.choices, required=False)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.00"), default=Decimal("0.00"), required=False)

class CreatePurchaseOrderSerializer(serializers.Serializer):
    supplier_id = serializers.UUIDField(required=True)
    order_date = serializers.DateField(required=False)
    expected_delivery_date = serializers.DateField(required=False)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"), required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    items = CreatePurchaseOrderItemInputSerializer(many=True, required=True)

class ReceiveItemInputSerializer(serializers.Serializer):
    purchase_order_item_id = serializers.UUIDField(required=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"), required=True)

class ReceivePurchaseOrderSerializer(serializers.Serializer):
    items = ReceiveItemInputSerializer(many=True, required=True)
    idempotency_key = serializers.CharField(max_length=128, required=False, allow_blank=True, default="")
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
