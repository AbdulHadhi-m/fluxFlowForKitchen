from decimal import Decimal
from rest_framework import serializers
from apps.procurement.models import (
    Supplier,
    SupplierType,
    PaymentTerms,
    SupplierContact,
    SupplierItem,
    SupplierPriceHistory,
    PurchaseRequisition,
    PurchaseRequisitionItem,
    PurchaseOrder,
    PurchaseOrderVersion,
    PurchaseOrderItem,
    PurchaseReceipt,
    PurchaseReceiptItem,
    PurchaseReturn,
    PurchaseReturnItem,
    SupplierCredit,
    SupplierInvoice,
    SupplierInvoiceItem,
    ProcurementBudget,
)
from apps.inventory.models import UnitOfMeasure, StorageLocation


class SupplierContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierContact
        fields = [
            "id",
            "name",
            "role",
            "email",
            "phone",
            "is_primary",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SupplierItemSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.CharField(source="inventory_item.name", read_only=True)
    inventory_item_sku = serializers.CharField(source="inventory_item.sku", read_only=True)
    inventory_item_unit = serializers.CharField(source="inventory_item.unit", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = SupplierItem
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "inventory_item",
            "inventory_item_name",
            "inventory_item_sku",
            "inventory_item_unit",
            "supplier_sku",
            "purchase_unit",
            "conversion_factor",
            "unit_cost",
            "minimum_order_quantity",
            "pack_size",
            "lead_time_days",
            "is_preferred",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SupplierPriceHistorySerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.CharField(source="inventory_item.name", read_only=True)
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SupplierPriceHistory
        fields = [
            "id",
            "supplier",
            "inventory_item",
            "inventory_item_name",
            "previous_price",
            "new_price",
            "effective_date",
            "currency",
            "unit",
            "changed_by_name",
            "reason",
            "created_at",
        ]
        read_only_fields = fields

    def get_changed_by_name(self, obj) -> str:
        if obj.changed_by:
            return getattr(obj.changed_by, "full_name", None) or obj.changed_by.email
        return "System"


class SupplierSerializer(serializers.ModelSerializer):
    contacts = SupplierContactSerializer(many=True, read_only=True)
    supplied_items_count = serializers.SerializerMethodField()
    open_orders_count = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = [
            "id",
            "supplier_code",
            "name",
            "supplier_type",
            "contact_person",
            "email",
            "phone",
            "address",
            "tax_id",
            "payment_terms",
            "currency",
            "lead_time_days",
            "minimum_order_value",
            "notes",
            "is_active",
            "contacts",
            "supplied_items_count",
            "open_orders_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "supplier_code", "created_at", "updated_at"]

    def get_supplied_items_count(self, obj) -> int:
        return obj.supplied_items.count()

    def get_open_orders_count(self, obj) -> int:
        return obj.purchase_orders.filter(status__in=[
            PurchaseOrder.POStatus.DRAFT,
            PurchaseOrder.POStatus.PENDING_APPROVAL,
            PurchaseOrder.POStatus.APPROVED,
            PurchaseOrder.POStatus.SENT,
            PurchaseOrder.POStatus.ACKNOWLEDGED,
            PurchaseOrder.POStatus.PARTIALLY_RECEIVED,
        ]).count()


class CreateSupplierSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=True)
    supplier_type = serializers.ChoiceField(choices=SupplierType.choices, default=SupplierType.PRIMARY_WHOLESALER)
    contact_person = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")
    address = serializers.CharField(required=False, allow_blank=True, default="")
    tax_id = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    payment_terms = serializers.ChoiceField(choices=PaymentTerms.choices, default=PaymentTerms.NET_30)
    currency = serializers.CharField(max_length=10, default="USD")
    lead_time_days = serializers.IntegerField(min_value=0, default=2)
    minimum_order_value = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class PurchaseRequisitionItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="inventory_item.name", read_only=True)
    sku = serializers.CharField(source="inventory_item.sku", read_only=True)

    class Meta:
        model = PurchaseRequisitionItem
        fields = [
            "id",
            "inventory_item",
            "item_name",
            "sku",
            "quantity",
            "unit",
            "estimated_unit_cost",
            "notes",
        ]
        read_only_fields = ["id", "item_name", "sku"]


class PurchaseRequisitionSerializer(serializers.ModelSerializer):
    items = PurchaseRequisitionItemSerializer(many=True, read_only=True)
    requester_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequisition
        fields = [
            "id",
            "requisition_number",
            "requester",
            "requester_name",
            "location",
            "required_date",
            "priority",
            "status",
            "reason",
            "notes",
            "items",
            "reviewed_by_name",
            "reviewed_at",
            "converted_po",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_requester_name(self, obj) -> str:
        if obj.requester:
            return getattr(obj.requester, "full_name", None) or obj.requester.email
        return "Unknown"

    def get_reviewed_by_name(self, obj) -> str:
        if obj.reviewed_by:
            return getattr(obj.reviewed_by, "full_name", None) or obj.reviewed_by.email
        return "Pending"


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    remaining_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, read_only=True)
    inventory_item_sku = serializers.CharField(source="inventory_item.sku", read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "id",
            "inventory_item",
            "item_name_snapshot",
            "inventory_item_sku",
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
            "quantity_accepted",
            "quantity_rejected",
            "rejection_reason",
            "batch_number",
            "expiry_date",
            "unit_cost_actual",
            "unit",
        ]
        read_only_fields = fields


class PurchaseReceiptSerializer(serializers.ModelSerializer):
    items = PurchaseReceiptItemSerializer(many=True, read_only=True)
    received_by_name = serializers.SerializerMethodField()
    purchase_order = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseReceipt
        fields = [
            "id",
            "receipt_number",
            "purchase_order",
            "invoice_number",
            "delivery_note_number",
            "storage_location",
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

    def get_purchase_order(self, obj) -> dict:
        po = obj.purchase_order
        return {
            "id": str(po.id),
            "po_number": po.po_number,
            "status": po.status,
            "status_display": po.get_status_display(),
            "total_amount": str(po.total_amount),
        }


class PurchaseOrderVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrderVersion
        fields = [
            "id",
            "version_number",
            "snapshot_data",
            "change_reason",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj) -> str:
        if obj.created_by:
            return getattr(obj.created_by, "full_name", None) or obj.created_by.email
        return "System"


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    receipts = PurchaseReceiptSerializer(many=True, read_only=True)
    revisions = PurchaseOrderVersionSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    supplier_code = serializers.CharField(source="supplier.supplier_code", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    sent_by_name = serializers.SerializerMethodField()

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
            "version",
            "location",
            "currency",
            "payment_terms",
            "order_date",
            "expected_delivery_date",
            "subtotal",
            "tax_amount",
            "discount_amount",
            "total_amount",
            "acknowledgement_status",
            "acknowledged_at",
            "supplier_notes",
            "notes",
            "created_by_name",
            "approved_by_name",
            "approved_at",
            "sent_by_name",
            "sent_at",
            "items",
            "receipts",
            "revisions",
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

    def get_sent_by_name(self, obj) -> str:
        if obj.sent_by:
            return getattr(obj.sent_by, "full_name", None) or obj.sent_by.email
        return None


class PurchaseReturnItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="inventory_item.name", read_only=True)

    class Meta:
        model = PurchaseReturnItem
        fields = [
            "id",
            "inventory_item",
            "item_name",
            "quantity",
            "unit",
            "unit_cost",
            "line_total",
            "notes",
        ]
        read_only_fields = fields


class PurchaseReturnSerializer(serializers.ModelSerializer):
    items = PurchaseReturnItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseReturn
        fields = [
            "id",
            "return_number",
            "supplier",
            "supplier_name",
            "purchase_receipt",
            "status",
            "reason",
            "total_credit_amount",
            "requested_by_name",
            "approved_by_name",
            "notes",
            "items",
            "created_at",
        ]
        read_only_fields = fields

    def get_requested_by_name(self, obj) -> str:
        if obj.requested_by:
            return getattr(obj.requested_by, "full_name", None) or obj.requested_by.email
        return "System"

    def get_approved_by_name(self, obj) -> str:
        if obj.approved_by:
            return getattr(obj.approved_by, "full_name", None) or obj.approved_by.email
        return None


class SupplierCreditSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = SupplierCredit
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "credit_note_number",
            "amount",
            "currency",
            "status",
            "related_return",
            "related_po",
            "reason",
            "issued_date",
            "notes",
            "created_at",
        ]
        read_only_fields = fields


class SupplierInvoiceItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="inventory_item.name", read_only=True)

    class Meta:
        model = SupplierInvoiceItem
        fields = [
            "id",
            "inventory_item",
            "item_name",
            "quantity_invoiced",
            "unit_price",
            "tax_amount",
            "line_total",
        ]
        read_only_fields = fields


class SupplierInvoiceSerializer(serializers.ModelSerializer):
    items = SupplierInvoiceItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)

    class Meta:
        model = SupplierInvoice
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "purchase_order",
            "po_number",
            "invoice_number",
            "invoice_date",
            "due_date",
            "subtotal",
            "tax_amount",
            "total_amount",
            "match_status",
            "quantity_variance",
            "price_variance",
            "tax_variance",
            "total_variance",
            "notes",
            "items",
            "created_at",
        ]
        read_only_fields = fields


class ProcurementBudgetSerializer(serializers.ModelSerializer):
    remaining_budget = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    utilization_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = ProcurementBudget
        fields = [
            "id",
            "name",
            "location",
            "department",
            "category",
            "period_type",
            "start_date",
            "end_date",
            "allocated_amount",
            "committed_amount",
            "actual_spent_amount",
            "remaining_budget",
            "utilization_percentage",
            "currency",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "committed_amount", "actual_spent_amount", "created_at"]
