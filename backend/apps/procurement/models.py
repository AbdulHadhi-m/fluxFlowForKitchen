from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.inventory.models import InventoryItem, UnitOfMeasure, StorageLocation


class SupplierType(models.TextChoices):
    PRIMARY_WHOLESALER = "PRIMARY_WHOLESALER", "Primary Wholesaler"
    LOCAL_PRODUCE = "LOCAL_PRODUCE", "Local Farm / Produce"
    SPECIALTY_IMPORTER = "SPECIALTY_IMPORTER", "Specialty Importer"
    BEVERAGE_DISTRIBUTOR = "BEVERAGE_DISTRIBUTOR", "Beverage Distributor"
    PACKAGING_SUPPLIER = "PACKAGING_SUPPLIER", "Packaging & Paper Goods"
    OTHER = "OTHER", "Other Vendor"


class PaymentTerms(models.TextChoices):
    IMMEDIATE = "IMMEDIATE", "Due on Receipt / Cash"
    NET_7 = "NET_7", "Net 7 Days"
    NET_15 = "NET_15", "Net 15 Days"
    NET_30 = "NET_30", "Net 30 Days"
    NET_60 = "NET_60", "Net 60 Days"
    COD = "COD", "Cash on Delivery"
    PREPAID = "PREPAID", "Prepaid / Advance"


class Supplier(UUIDModel, TimeStampedModel, StatusModel):
    """
    Vendor / Food distributor entity scoped per restaurant tenant.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="suppliers",
        help_text="Restaurant tenant"
    )
    supplier_code = models.CharField(
        max_length=32,
        help_text="Human-readable unique code (e.g. SUP-000001)"
    )
    name = models.CharField(
        max_length=200,
        help_text="Supplier business / company name"
    )
    supplier_type = models.CharField(
        max_length=30,
        choices=SupplierType.choices,
        default=SupplierType.PRIMARY_WHOLESALER,
        db_index=True
    )
    contact_person = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Primary sales rep or contact person"
    )
    email = models.EmailField(
        blank=True,
        default="",
        help_text="Supplier contact email"
    )
    phone = models.CharField(
        max_length=30,
        blank=True,
        default="",
        help_text="Supplier phone number"
    )
    address = models.TextField(
        blank=True,
        default="",
        help_text="Physical delivery / warehouse address"
    )
    tax_id = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Tax / VAT / GST Registration number"
    )
    payment_terms = models.CharField(
        max_length=30,
        choices=PaymentTerms.choices,
        default=PaymentTerms.NET_30
    )
    currency = models.CharField(
        max_length=10,
        default="USD",
        help_text="Invoicing currency"
    )
    lead_time_days = models.PositiveIntegerField(
        default=2,
        help_text="Standard vendor fulfillment lead time in days"
    )
    minimum_order_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Minimum order value threshold for free delivery"
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Internal notes or special vendor terms"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Soft-deactivation flag"
    )

    class Meta:
        verbose_name = "Supplier"
        verbose_name_plural = "Suppliers"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "supplier_code"], name="unique_supplier_code_per_restaurant"),
        ]
        indexes = [
            models.Index(fields=["restaurant", "is_active"]),
            models.Index(fields=["restaurant", "supplier_type"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.supplier_code}) - {self.restaurant.name}"


class SupplierContact(UUIDModel, TimeStampedModel):
    """
    Multiple contact persons associated with a vendor supplier.
    """
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name="contacts"
    )
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=100, blank=True, default="Account Rep")
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Supplier Contact"
        verbose_name_plural = "Supplier Contacts"
        ordering = ["-is_primary", "name"]

    def __str__(self):
        return f"{self.name} ({self.role}) - {self.supplier.name}"


class SupplierItem(UUIDModel, TimeStampedModel):
    """
    Item catalog mapping between vendor products and internal inventory raw items.
    """
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name="supplied_items"
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="supplier_links"
    )
    supplier_sku = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Vendor product catalog SKU / barcode"
    )
    purchase_unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices,
        default=UnitOfMeasure.KG,
        help_text="Unit vendor sells in (e.g. Box, Case, Bag, kg)"
    )
    conversion_factor = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal("1.0000"),
        help_text="1 Purchase Unit = X Inventory Stock Units"
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Negotiated purchase price per purchase unit"
    )
    minimum_order_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal("1.000"),
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Vendor Minimum Order Quantity (MOQ)"
    )
    pack_size = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal("1.000"),
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Package quantity increments (e.g. pack of 6 or 12)"
    )
    lead_time_days = models.PositiveIntegerField(
        default=2,
        help_text="Item-specific delivery lead time"
    )
    is_preferred = models.BooleanField(
        default=False,
        help_text="Primary preferred supplier for this ingredient"
    )
    is_active = models.BooleanField(
        default=True
    )

    class Meta:
        verbose_name = "Supplier Item"
        verbose_name_plural = "Supplier Items"
        constraints = [
            models.UniqueConstraint(fields=["supplier", "inventory_item"], name="unique_supplier_inventory_item"),
        ]
        indexes = [
            models.Index(fields=["inventory_item", "is_preferred"]),
        ]

    def __str__(self):
        return f"{self.supplier.name} -> {self.inventory_item.name} (${self.unit_cost}/{self.purchase_unit})"


class SupplierPriceHistory(UUIDModel, TimeStampedModel):
    """
    Immutable audit log tracking supplier commodity price changes over time.
    """
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name="price_history"
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="supplier_price_history"
    )
    previous_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00")
    )
    new_price = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )
    effective_date = models.DateField()
    currency = models.CharField(max_length=10, default="USD")
    unit = models.CharField(max_length=20, choices=UnitOfMeasure.choices, default=UnitOfMeasure.KG)
    changed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    reason = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        verbose_name = "Supplier Price History"
        verbose_name_plural = "Supplier Price Histories"
        ordering = ["-effective_date", "-created_at"]


class PurchaseRequisition(UUIDModel, TimeStampedModel, StatusModel):
    """
    Internal kitchen / floor requisition request before converting to formal PO.
    """
    class RequisitionStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted for Approval"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"
        CONVERTED_TO_PO = "CONVERTED_TO_PO", "Converted to PO"

    class RequisitionPriority(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        URGENT = "URGENT", "Urgent (Low Stock)"
        EMERGENCY = "EMERGENCY", "Emergency (Stockout)"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="purchase_requisitions"
    )
    requisition_number = models.CharField(
        max_length=32,
        help_text="Unique requisition number (e.g. REQ-20260817-XXXX)"
    )
    requester = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_requisitions"
    )
    location = models.CharField(
        max_length=30,
        choices=StorageLocation.choices,
        default=StorageLocation.KITCHEN
    )
    required_date = models.DateField(
        null=True,
        blank=True,
        help_text="Required date by kitchen line"
    )
    priority = models.CharField(
        max_length=20,
        choices=RequisitionPriority.choices,
        default=RequisitionPriority.NORMAL
    )
    status = models.CharField(
        max_length=30,
        choices=RequisitionStatus.choices,
        default=RequisitionStatus.DRAFT,
        db_index=True
    )
    reason = models.CharField(max_length=255, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_requisitions"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    converted_po = models.ForeignKey(
        "PurchaseOrder",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="source_requisitions"
    )

    class Meta:
        verbose_name = "Purchase Requisition"
        verbose_name_plural = "Purchase Requisitions"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "requisition_number"], name="unique_req_num_per_restaurant"),
        ]


class PurchaseRequisitionItem(UUIDModel, TimeStampedModel):
    """
    Line item inside a purchase requisition.
    """
    requisition = models.ForeignKey(
        PurchaseRequisition,
        on_delete=models.CASCADE,
        related_name="items"
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="requisition_items"
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))]
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices
    )
    estimated_unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00")
    )
    notes = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        verbose_name = "Purchase Requisition Item"
        verbose_name_plural = "Purchase Requisition Items"


class PurchaseOrder(UUIDModel, TimeStampedModel, StatusModel):
    """
    Purchase order contract issued to a supplier for raw material inventory.
    """
    class POStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted for Approval"
        PENDING_APPROVAL = "PENDING_APPROVAL", "Pending Approval"
        APPROVED = "APPROVED", "Approved"
        SENT = "SENT", "Sent to Vendor"
        ACKNOWLEDGED = "ACKNOWLEDGED", "Vendor Acknowledged"
        PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED", "Partially Received"
        RECEIVED = "RECEIVED", "Fully Received"
        CANCELLED = "CANCELLED", "Cancelled"
        CLOSED = "CLOSED", "Closed"

    class AcknowledgementStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Acknowledgement"
        ACCEPTED = "ACCEPTED", "Accepted in Full"
        PARTIALLY_ACCEPTED = "PARTIALLY_ACCEPTED", "Partially Accepted"
        REJECTED = "REJECTED", "Rejected by Vendor"
        DELIVERY_DATE_CHANGED = "DELIVERY_DATE_CHANGED", "Rescheduled Delivery"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="purchase_orders",
        help_text="Restaurant tenant"
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
        help_text="Target vendor supplier"
    )
    po_number = models.CharField(
        max_length=32,
        help_text="Sequential human-readable PO number (e.g. PO-000001)"
    )
    status = models.CharField(
        max_length=30,
        choices=POStatus.choices,
        default=POStatus.DRAFT,
        db_index=True,
        help_text="Lifecycle state of the purchase order"
    )
    version = models.PositiveIntegerField(
        default=1,
        help_text="Revision sequence number"
    )
    location = models.CharField(
        max_length=30,
        choices=StorageLocation.choices,
        default=StorageLocation.MAIN_STORE,
        help_text="Target receiving storage location"
    )
    currency = models.CharField(
        max_length=10,
        default="USD"
    )
    payment_terms = models.CharField(
        max_length=30,
        choices=PaymentTerms.choices,
        default=PaymentTerms.NET_30
    )
    order_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date the purchase order was issued"
    )
    expected_delivery_date = models.DateField(
        null=True,
        blank=True,
        help_text="Expected shipment arrival date"
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Gross total of line items before tax"
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Purchasing tax amount"
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Special vendor discount"
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Net total procurement cost"
    )
    acknowledgement_status = models.CharField(
        max_length=30,
        choices=AcknowledgementStatus.choices,
        default=AcknowledgementStatus.PENDING
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    supplier_notes = models.TextField(blank=True, default="")
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Delivery instructions or internal comments"
    )
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_purchase_orders",
        help_text="Staff member who created the PO"
    )
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_purchase_orders",
        help_text="Manager who approved the purchase order"
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of managerial approval"
    )
    sent_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sent_purchase_orders"
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="closed_purchase_orders"
    )
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Purchase Order"
        verbose_name_plural = "Purchase Orders"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "po_number"], name="unique_po_number_per_restaurant"),
        ]
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["restaurant", "created_at"]),
            models.Index(fields=["restaurant", "expected_delivery_date"]),
        ]

    def __str__(self):
        return f"{self.po_number} ({self.supplier.name}) - {self.status}"


class PurchaseOrderVersion(UUIDModel, TimeStampedModel):
    """
    Historical snapshot of an approved Purchase Order before amendments.
    """
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="revisions"
    )
    version_number = models.PositiveIntegerField()
    snapshot_data = models.JSONField(
        help_text="Full serialized state of PO and lines at this version"
    )
    change_reason = models.CharField(max_length=255, blank=True, default="")
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    class Meta:
        verbose_name = "Purchase Order Version"
        verbose_name_plural = "Purchase Order Versions"
        ordering = ["-version_number"]


class PurchaseOrderItem(UUIDModel, TimeStampedModel, StatusModel):
    """
    Individual raw material line item in a Purchase Order.
    """
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="Parent purchase order"
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="po_line_items",
        help_text="Target raw material catalog item"
    )
    item_name_snapshot = models.CharField(
        max_length=200,
        help_text="Snapshot of ingredient name at PO creation"
    )
    quantity_ordered = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Total quantity ordered"
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices,
        help_text="Unit of measurement"
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Cost per unit"
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Total line cost (quantity_ordered * unit_cost)"
    )
    quantity_received = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
        help_text="Cumulative quantity physically received into inventory"
    )

    class Meta:
        verbose_name = "Purchase Order Item"
        verbose_name_plural = "Purchase Order Items"

    @property
    def remaining_quantity(self) -> Decimal:
        return max(Decimal("0.000"), self.quantity_ordered - self.quantity_received)

    def __str__(self):
        return f"{self.item_name_snapshot} ({self.quantity_received}/{self.quantity_ordered} {self.unit})"


class PurchaseReceipt(UUIDModel, TimeStampedModel, StatusModel):
    """
    Physical delivery batch receipt tracking a stock intake event.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="purchase_receipts"
    )
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="receipts"
    )
    receipt_number = models.CharField(
        max_length=32,
        help_text="Sequential receipt number (e.g. REC-000001)"
    )
    invoice_number = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Vendor delivery invoice number"
    )
    delivery_note_number = models.CharField(
        max_length=100,
        blank=True,
        default=""
    )
    storage_location = models.CharField(
        max_length=30,
        choices=StorageLocation.choices,
        default=StorageLocation.MAIN_STORE
    )
    received_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="received_purchase_receipts"
    )
    idempotency_key = models.CharField(
        max_length=128,
        blank=True,
        default="",
        db_index=True,
        help_text="Client deduplication token"
    )
    notes = models.TextField(
        blank=True,
        default=""
    )

    class Meta:
        verbose_name = "Purchase Receipt"
        verbose_name_plural = "Purchase Receipts"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.receipt_number} for {self.purchase_order.po_number}"


class PurchaseReceiptItem(UUIDModel, TimeStampedModel, StatusModel):
    """
    Line item inside a physical intake receipt with accepted/rejected inspection quantities.
    """
    class RejectionReason(models.TextChoices):
        NONE = "NONE", "Accepted / No Defect"
        DAMAGED = "DAMAGED", "Damaged / Broken"
        EXPIRED = "EXPIRED", "Expired / Short Expiry"
        WRONG_ITEM = "WRONG_ITEM", "Wrong Product Shipped"
        SUBSTANDARD_QUALITY = "SUBSTANDARD_QUALITY", "Substandard / Spoiled Quality"
        OVER_DELIVERY = "OVER_DELIVERY", "Excess Over-Delivery"

    receipt = models.ForeignKey(
        PurchaseReceipt,
        on_delete=models.CASCADE,
        related_name="items"
    )
    purchase_order_item = models.ForeignKey(
        PurchaseOrderItem,
        on_delete=models.PROTECT,
        related_name="receipt_items"
    )
    quantity_received = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Total physical quantity delivered by driver"
    )
    quantity_accepted = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        help_text="Accepted quantity booked into usable inventory"
    )
    quantity_rejected = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        help_text="Rejected quantity turned away at the loading dock"
    )
    rejection_reason = models.CharField(
        max_length=30,
        choices=RejectionReason.choices,
        default=RejectionReason.NONE
    )
    batch_number = models.CharField(max_length=100, blank=True, default="")
    expiry_date = models.DateField(null=True, blank=True)
    unit_cost_actual = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Actual invoiced cost per unit"
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices
    )

    class Meta:
        verbose_name = "Purchase Receipt Item"
        verbose_name_plural = "Purchase Receipt Items"

    def __str__(self):
        return f"{self.quantity_accepted} accepted ({self.quantity_rejected} rejected) {self.unit} for {self.purchase_order_item.item_name_snapshot}"


class PurchaseReturn(UUIDModel, TimeStampedModel, StatusModel):
    """
    Formal return of damaged, expired, or incorrect goods to a supplier.
    """
    class ReturnStatus(models.TextChoices):
        REQUESTED = "REQUESTED", "Return Requested"
        APPROVED = "APPROVED", "Approved by Manager"
        DISPATCHED = "DISPATCHED", "Goods Dispatched to Supplier"
        COMPLETED = "COMPLETED", "Completed & Credit Issued"
        REJECTED = "REJECTED", "Rejected by Supplier"

    class ReturnReason(models.TextChoices):
        DAMAGED = "DAMAGED", "Damaged Goods"
        WRONG_ITEM = "WRONG_ITEM", "Wrong Item Delivered"
        EXPIRED = "EXPIRED", "Expired Product"
        QUALITY_ISSUE = "QUALITY_ISSUE", "Quality Issue / Defect"
        OVER_DELIVERY = "OVER_DELIVERY", "Excess Over-Delivery"
        OTHER = "OTHER", "Other"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="purchase_returns"
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="returns"
    )
    purchase_receipt = models.ForeignKey(
        PurchaseReceipt,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="returns"
    )
    return_number = models.CharField(
        max_length=32,
        help_text="Unique return number (e.g. RET-20260817-XXXX)"
    )
    status = models.CharField(
        max_length=30,
        choices=ReturnStatus.choices,
        default=ReturnStatus.REQUESTED,
        db_index=True
    )
    reason = models.CharField(
        max_length=30,
        choices=ReturnReason.choices,
        default=ReturnReason.DAMAGED
    )
    total_credit_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00")
    )
    requested_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="requested_returns"
    )
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_returns"
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Purchase Return"
        verbose_name_plural = "Purchase Returns"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "return_number"], name="unique_return_num_per_restaurant"),
        ]


class PurchaseReturnItem(UUIDModel, TimeStampedModel):
    """
    Line item inside a purchase return.
    """
    purchase_return = models.ForeignKey(
        PurchaseReturn,
        on_delete=models.CASCADE,
        related_name="items"
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="return_items"
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))]
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00")
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00")
    )
    notes = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        verbose_name = "Purchase Return Item"
        verbose_name_plural = "Purchase Return Items"


class SupplierCredit(UUIDModel, TimeStampedModel, StatusModel):
    """
    Credit note issued by a vendor for returns, over-billing, or rebates.
    """
    class CreditStatus(models.TextChoices):
        PENDING = "PENDING", "Pending / Available"
        APPLIED = "APPLIED", "Applied to Invoices"
        REFUNDED = "REFUNDED", "Refunded in Cash"
        CANCELLED = "CANCELLED", "Cancelled"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="supplier_credits"
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="credits"
    )
    credit_note_number = models.CharField(max_length=100)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))]
    )
    currency = models.CharField(max_length=10, default="USD")
    status = models.CharField(
        max_length=30,
        choices=CreditStatus.choices,
        default=CreditStatus.PENDING,
        db_index=True
    )
    related_return = models.ForeignKey(
        PurchaseReturn,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="credits"
    )
    related_po = models.ForeignKey(
        PurchaseOrder,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="credits"
    )
    reason = models.CharField(max_length=255, blank=True, default="")
    issued_date = models.DateField()
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Supplier Credit"
        verbose_name_plural = "Supplier Credits"
        ordering = ["-issued_date"]


class SupplierInvoice(UUIDModel, TimeStampedModel, StatusModel):
    """
    Vendor invoice for 3-way matching against Purchase Orders and Goods Receipts.
    """
    class MatchStatus(models.TextChoices):
        UNMATCHED = "UNMATCHED", "Unmatched"
        MATCHED = "MATCHED", "3-Way Match Passed"
        PARTIAL_MATCH = "PARTIAL_MATCH", "Partial Match"
        VARIANCE = "VARIANCE", "Price / Qty Variance Detected"
        REQUIRES_REVIEW = "REQUIRES_REVIEW", "Managerial Review Required"
        REJECTED = "REJECTED", "Invoice Rejected"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="supplier_invoices"
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="invoices"
    )
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invoices"
    )
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    match_status = models.CharField(
        max_length=30,
        choices=MatchStatus.choices,
        default=MatchStatus.UNMATCHED,
        db_index=True
    )
    quantity_variance = models.DecimalField(max_digits=12, decimal_places=3, default=Decimal("0.000"))
    price_variance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_variance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_variance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_invoices"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Supplier Invoice"
        verbose_name_plural = "Supplier Invoices"
        ordering = ["-invoice_date"]


class SupplierInvoiceItem(UUIDModel, TimeStampedModel):
    """
    Line item inside a vendor invoice.
    """
    invoice = models.ForeignKey(
        SupplierInvoice,
        on_delete=models.CASCADE,
        related_name="items"
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="invoiced_items"
    )
    quantity_invoiced = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        verbose_name = "Supplier Invoice Item"
        verbose_name_plural = "Supplier Invoice Items"


class ProcurementBudget(UUIDModel, TimeStampedModel):
    """
    Procurement spend budget caps by location, department, or food category.
    """
    class PeriodType(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        QUARTERLY = "QUARTERLY", "Quarterly"
        YEARLY = "YEARLY", "Yearly"
        CUSTOM = "CUSTOM", "Custom Period"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="procurement_budgets"
    )
    name = models.CharField(max_length=150, help_text="e.g. Kitchen Food & Beverage Q3 Budget")
    location = models.CharField(
        max_length=30,
        choices=StorageLocation.choices,
        default=StorageLocation.MAIN_STORE
    )
    department = models.CharField(max_length=100, blank=True, default="Kitchen")
    category = models.CharField(max_length=100, blank=True, default="ALL")
    period_type = models.CharField(
        max_length=20,
        choices=PeriodType.choices,
        default=PeriodType.MONTHLY
    )
    start_date = models.DateField()
    end_date = models.DateField()
    allocated_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))]
    )
    committed_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Amount committed on approved / open POs"
    )
    actual_spent_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Amount invoiced / received"
    )
    currency = models.CharField(max_length=10, default="USD")
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Procurement Budget"
        verbose_name_plural = "Procurement Budgets"
        ordering = ["-start_date"]

    @property
    def remaining_budget(self) -> Decimal:
        return self.allocated_amount - (self.committed_amount + self.actual_spent_amount)

    @property
    def utilization_percentage(self) -> Decimal:
        if self.allocated_amount <= Decimal("0.00"):
            return Decimal("0.00")
        used = self.committed_amount + self.actual_spent_amount
        return (used / self.allocated_amount * Decimal("100.00")).quantize(Decimal("0.01"))
