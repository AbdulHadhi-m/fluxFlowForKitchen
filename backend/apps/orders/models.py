import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuItem

class Order(UUIDModel, TimeStampedModel, StatusModel):
    """
    Restaurant customer order entity connecting table seating, staff server, and item lines.
    Maintains authoritative monetary totals and lifecycle status state machine.
    """
    class OrderStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PLACED = "PLACED", "Placed"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    class OrderType(models.TextChoices):
        DINE_IN = "DINE_IN", "Dine In"
        TAKEAWAY = "TAKEAWAY", "Takeaway"
        DELIVERY = "DELIVERY", "Delivery"

    class OrderSource(models.TextChoices):
        POS = "POS", "Point of Sale"
        ONLINE = "ONLINE", "Online Web"
        QR = "QR", "QR Table"
        PHONE = "PHONE", "Phone"
        MANUAL = "MANUAL", "Manual"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="orders",
        help_text="Restaurant organization owning this order"
    )
    order_number = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Human-readable sequential order identifier (e.g. ORD-000001)"
    )
    order_type = models.CharField(
        max_length=20,
        choices=OrderType.choices,
        default=OrderType.DINE_IN,
        db_index=True,
        help_text="Fulfillment classification (Dine In, Takeaway, Delivery)"
    )
    source = models.CharField(
        max_length=20,
        choices=OrderSource.choices,
        default=OrderSource.POS,
        db_index=True,
        help_text="Channel where order originated"
    )
    table = models.ForeignKey(
        RestaurantTable,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
        help_text="Dining floor table linked to this dine-in order (null for takeaway)"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders_created",
        help_text="Authenticated staff employee or registered customer who initiated the order"
    )
    customer = models.ForeignKey(
        "customers.Customer",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
        help_text="Associated customer CRM profile"
    )
    guest_name = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Guest full name for unauthenticated/takeaway orders"
    )
    guest_phone = models.CharField(
        max_length=30,
        blank=True,
        default="",
        help_text="Guest contact phone for order tracking"
    )
    guest_email = models.EmailField(
        max_length=255,
        blank=True,
        default="",
        help_text="Guest email for invoice and receipt dispatch"
    )
    pickup_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Scheduled pickup time for takeaway orders"
    )
    tracking_token = models.UUIDField(
        default=uuid.uuid4,
        db_index=True,
        editable=False,
        help_text="Cryptographically secure token for public customer order tracking"
    )
    qr_session_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        help_text="QR table ordering session token"
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PLACED,
        db_index=True,
        help_text="Current operational order lifecycle status"
    )
    notes = models.TextField(
        blank=True,
        help_text="General order notes or special customer requests"
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Sum of all order item line totals"
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Authoritative final payable order total"
    )

    class Meta:
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "order_number"],
                name="unique_order_number_per_restaurant"
            ),
        ]
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["restaurant", "-created_at"]),
            models.Index(fields=["restaurant", "table"]),
        ]

    def __str__(self):
        return f"{self.order_number} ({self.status}) - {self.restaurant.name}"

    @property
    def is_editable(self) -> bool:
        """Determines if the order items and quantities can still be modified."""
        return self.status in [self.OrderStatus.DRAFT]

class OrderItem(UUIDModel, TimeStampedModel):
    """
    Individual billable line item within an order.
    Snapshots menu item name and price at the exact moment of order placement
    to safeguard historical orders against retrospective catalog changes.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        help_text="Parent order containing this line item"
    )
    menu_item = models.ForeignKey(
        MenuItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="order_items",
        help_text="Reference to original catalog MenuItem record (can be null if item was deleted)"
    )
    item_name_snapshot = models.CharField(
        max_length=200,
        help_text="Immutable snapshot of MenuItem.name at order creation"
    )
    unit_price_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Immutable snapshot of MenuItem.price at order creation"
    )
    quantity = models.PositiveIntegerField(
        default=1,
        help_text="Ordered item count (>= 1)"
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Authoritative calculated line price (unit_price_snapshot * quantity)"
    )
    notes = models.TextField(
        blank=True,
        help_text="Special preparation / dietary notes (e.g. 'Extra spicy', 'No dairy')"
    )

    class Meta:
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantity__gte=1),
                name="check_positive_order_item_quantity"
            ),
        ]
        indexes = [
            models.Index(fields=["order", "created_at"]),
        ]

    def __str__(self):
        return f"{self.item_name_snapshot} x{self.quantity} (${self.line_total})"

    def calculate_line_total(self) -> Decimal:
        self.line_total = self.unit_price_snapshot * Decimal(self.quantity)
        return self.line_total

    def save(self, *args, **kwargs):
        self.calculate_line_total()
        super().save(*args, **kwargs)
