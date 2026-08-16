from django.db import models
from apps.core.models import UUIDModel, TimeStampedModel
from apps.restaurants.models import Restaurant
from apps.accounts.models import User

class NotificationSeverity(models.TextChoices):
    INFO = "INFO", "Info"
    SUCCESS = "SUCCESS", "Success"
    WARNING = "WARNING", "Warning"
    CRITICAL = "CRITICAL", "Critical"

class NotificationType(models.TextChoices):
    INVENTORY_LOW_STOCK = "INVENTORY_LOW_STOCK", "Low Stock Alert"
    INVENTORY_OUT_OF_STOCK = "INVENTORY_OUT_OF_STOCK", "Out of Stock Alert"
    PURCHASE_ORDER_PENDING = "PURCHASE_ORDER_PENDING", "PO Pending Approval"
    PURCHASE_ORDER_APPROVED = "PURCHASE_ORDER_APPROVED", "PO Approved"
    PURCHASE_ORDER_PARTIALLY_RECEIVED = "PURCHASE_ORDER_PARTIALLY_RECEIVED", "PO Partially Received"
    PURCHASE_ORDER_RECEIVED = "PURCHASE_ORDER_RECEIVED", "PO Fully Received"
    ORDER_NEW = "ORDER_NEW", "New Order Placed"
    ORDER_CANCELLED = "ORDER_CANCELLED", "Order Cancelled"
    KDS_READY = "KDS_READY", "Kitchen Ticket Ready"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED", "Payment Settled"
    SYSTEM_ALERT = "SYSTEM_ALERT", "System Alert"

class Notification(UUIDModel, TimeStampedModel):
    """
    Centralized persisted in-app alert and operational notice.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="Tenant context"
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="Staff recipient user"
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM_ALERT,
        db_index=True
    )
    severity = models.CharField(
        max_length=20,
        choices=NotificationSeverity.choices,
        default=NotificationSeverity.INFO,
        db_index=True
    )
    title = models.CharField(
        max_length=200,
        help_text="Notification heading"
    )
    message = models.TextField(
        help_text="Notification detailed body"
    )
    is_read = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Read acknowledgment status"
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True
    )
    action_url = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Client route path (e.g. /inventory/items/123)"
    )
    entity_type = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Originating model name (e.g. inventory_item, purchase_order)"
    )
    entity_id = models.CharField(
        max_length=64,
        blank=True,
        default="",
        help_text="Originating entity UUID/ID"
    )
    deduplication_key = models.CharField(
        max_length=128,
        blank=True,
        default="",
        db_index=True,
        help_text="State deduplication hash"
    )

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "recipient", "is_read", "created_at"]),
            models.Index(fields=["restaurant", "deduplication_key"]),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.title} -> {self.recipient.email}"

class NotificationPreference(UUIDModel, TimeStampedModel):
    """
    User notification preferences within a restaurant tenant.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="notification_preferences"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notification_preferences"
    )
    in_app_enabled = models.BooleanField(default=True)
    realtime_enabled = models.BooleanField(default=True)
    low_stock_alerts = models.BooleanField(default=True)
    order_alerts = models.BooleanField(default=True)
    procurement_alerts = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "user"], name="unique_user_notification_preference"),
        ]

    def __str__(self):
        return f"Preferences: {self.user.email} @ {self.restaurant.name}"
