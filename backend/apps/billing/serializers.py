from rest_framework import serializers
from decimal import Decimal
from apps.billing.models import Bill, BillItem, Payment, TaxRule

class TaxRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRule
        fields = ["id", "name", "rate", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]

class BillItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="item_name_snapshot", read_only=True)
    unit_price = serializers.DecimalField(source="unit_price_snapshot", max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = BillItem
        fields = [
            "id",
            "name",
            "unit_price",
            "quantity",
            "line_total",
        ]
        read_only_fields = fields

class PaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_method",
            "amount",
            "amount_tendered",
            "change_returned",
            "reference",
            "status",
            "received_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_received_by_name(self, obj) -> str:
        if obj.received_by:
            full_name = getattr(obj.received_by, "full_name", None)
            return full_name if full_name else obj.received_by.email
        return "Unknown"

class BillSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    table_name = serializers.CharField(source="order.table.name", read_only=True, default=None)
    cashier_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    items = BillItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Bill
        fields = [
            "id",
            "bill_number",
            "order_id",
            "order_number",
            "table_name",
            "cashier_name",
            "status",
            "status_display",
            "subtotal",
            "discount_type",
            "discount_value",
            "discount_amount",
            "service_charge_rate",
            "service_charge_amount",
            "tax_rate_snapshot",
            "tax_amount",
            "rounding_adjustment",
            "grand_total",
            "total_paid",
            "balance_due",
            "notes",
            "items",
            "payments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_cashier_name(self, obj) -> str:
        if obj.created_by:
            full_name = getattr(obj.created_by, "full_name", None)
            return full_name if full_name else obj.created_by.email
        return "Unknown"

class CreateBillSerializer(serializers.Serializer):
    order_id = serializers.UUIDField(required=True)
    discount_type = serializers.ChoiceField(
        choices=Bill.DiscountType.choices,
        default=Bill.DiscountType.NONE
    )
    discount_value = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        required=False
    )
    service_charge_rate = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        required=False
    )
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")

class ProcessPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
        required=True
    )
    payment_method = serializers.ChoiceField(
        choices=Payment.PaymentMethod.choices,
        default=Payment.PaymentMethod.CASH
    )
    amount_tendered = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    reference = serializers.CharField(max_length=128, required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(max_length=128, required=False, allow_blank=True, allow_null=True)

class VoidBillSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
