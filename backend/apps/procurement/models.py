from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.inventory.models import InventoryItem, UnitOfMeasure

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
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Internal notes or terms"
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
        ]

    def __str__(self):
        return f"{self.name} ({self.supplier_code}) - {self.restaurant.name}"

class PurchaseOrder(UUIDModel, TimeStampedModel, StatusModel):
    """
    Purchase order contract issued to a supplier for raw material inventory.
    """
    class POStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED", "Partially Received"
        RECEIVED = "RECEIVED", "Fully Received"
        CANCELLED = "CANCELLED", "Cancelled"

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
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Net total procurement cost"
    )
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
        ]

    def __str__(self):
        return f"{self.po_number} ({self.supplier.name}) - {self.status}"

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
    Line item inside a physical intake receipt.
    """
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
        validators=[MinValueValidator(Decimal("0.001"))]
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices
    )

    class Meta:
        verbose_name = "Purchase Receipt Item"
        verbose_name_plural = "Purchase Receipt Items"

    def __str__(self):
        return f"{self.quantity_received} {self.unit} for {self.purchase_order_item.item_name_snapshot}"
