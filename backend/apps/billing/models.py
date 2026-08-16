from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant
from apps.orders.models import Order, OrderItem
from apps.accounts.models import User

class TaxRule(UUIDModel, TimeStampedModel, StatusModel):
    """
    Configurable restaurant tax rate rule (e.g. VAT 5%, GST 18%, Sales Tax).
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="tax_rules",
        help_text="Restaurant owning this tax policy"
    )
    name = models.CharField(max_length=100, help_text="Tax name (e.g. VAT, GST, City Tax)")
    rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("5.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))],
        help_text="Percentage tax rate (e.g. 5.00 for 5%)"
    )

    class Meta:
        verbose_name = "Tax Rule"
        verbose_name_plural = "Tax Rules"
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "name"], name="unique_tax_rule_per_restaurant"),
        ]

    def __str__(self):
        return f"{self.name} ({self.rate}%) - {self.restaurant.name}"

class Bill(UUIDModel, TimeStampedModel, StatusModel):
    """
    Financial bill / invoice record created from a customer Order.
    Preserves immutable financial snapshots for historical auditing.
    """
    class BillStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        FINALIZED = "FINALIZED", "Finalized"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
        PAID = "PAID", "Paid"
        VOID = "VOID", "Void"

    class DiscountType(models.TextChoices):
        NONE = "NONE", "None"
        PERCENTAGE = "PERCENTAGE", "Percentage"
        FIXED = "FIXED", "Fixed Amount"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="bills",
        help_text="Restaurant organization owning this financial record"
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name="bills",
        help_text="Source order being billed"
    )
    bill_number = models.CharField(
        max_length=32,
        db_index=True,
        help_text="Sequential human-readable bill/invoice number (e.g. BILL-000001)"
    )
    status = models.CharField(
        max_length=20,
        choices=BillStatus.choices,
        default=BillStatus.DRAFT,
        db_index=True,
        help_text="Current billing lifecycle status"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="generated_bills",
        help_text="Employee/cashier who generated the bill"
    )

    # Authoritative Monetary Snapshot Fields
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Sum of all bill line items before deductions and additions"
    )
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.NONE
    )
    discount_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Percentage or fixed discount value input"
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Computed currency discount deduction"
    )
    service_charge_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Service charge percentage applied"
    )
    service_charge_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Computed service charge currency amount"
    )
    tax_rate_snapshot = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Snapshot of applicable tax percentage at finalization"
    )
    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Computed tax currency amount"
    )
    rounding_adjustment = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Currency rounding adjustment applied to reach round grand total"
    )
    grand_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Authoritative total amount payable by customer"
    )
    total_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Cumulative sum of settled payments"
    )
    balance_due = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Remaining unpaid balance"
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Billing / invoice remarks or customer instructions"
    )

    class Meta:
        verbose_name = "Bill"
        verbose_name_plural = "Bills"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "bill_number"], name="unique_bill_number_per_restaurant"),
        ]
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["restaurant", "created_at"]),
        ]

    def __str__(self):
        return f"{self.bill_number} ({self.status}) - {self.restaurant.name}"

class BillItem(UUIDModel, TimeStampedModel, StatusModel):
    """
    Immutable line item snapshot of an OrderItem billed to the customer.
    """
    bill = models.ForeignKey(
        Bill,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="Parent bill record"
    )
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bill_items",
        help_text="Original source order item"
    )
    item_name_snapshot = models.CharField(
        max_length=255,
        help_text="Frozen catalog item name at billing time"
    )
    unit_price_snapshot = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Frozen unit price at billing time"
    )
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Quantity billed"
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Computed line total (unit_price * quantity)"
    )

    class Meta:
        verbose_name = "Bill Item"
        verbose_name_plural = "Bill Items"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.quantity}x {self.item_name_snapshot} ({self.line_total})"

class Payment(UUIDModel, TimeStampedModel, StatusModel):
    """
    Payment transaction receipt settled against an outstanding bill.
    Supports split tender, cash change calculations, and idempotency protection.
    """
    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        CARD = "CARD", "Credit/Debit Card"
        UPI = "UPI", "UPI / QR Code"
        BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer"
        OTHER = "OTHER", "Other"

    class PaymentStatus(models.TextChoices):
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="payments",
        help_text="Restaurant organization receiving payment"
    )
    bill = models.ForeignKey(
        Bill,
        on_delete=models.PROTECT,
        related_name="payments",
        help_text="Bill being settled"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
        help_text="Tender method used for transaction"
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Net amount applied towards bill settlement"
    )
    amount_tendered = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Gross cash tendered by customer for change calculation"
    )
    change_returned = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Change returned to customer"
    )
    reference = models.CharField(
        max_length=128,
        blank=True,
        default="",
        help_text="External payment reference, card last 4 digits, or transaction ID"
    )
    idempotency_key = models.CharField(
        max_length=128,
        null=True,
        blank=True,
        db_index=True,
        help_text="Unique client idempotency token preventing double billing"
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.SUCCESS,
        db_index=True
    )
    received_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="processed_payments",
        help_text="Cashier or staff member processing payment"
    )

    class Meta:
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["restaurant", "idempotency_key"]),
        ]

    def __str__(self):
        return f"{self.payment_method} {self.amount} for {self.bill.bill_number}"
