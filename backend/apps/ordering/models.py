import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta
from apps.core.models import UUIDModel, TimeStampedModel
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.customers.models import Customer

class CartSession(UUIDModel, TimeStampedModel):
    """
    Optional server-side persisted customer/guest cart session for digital menu ordering.
    Safely stores temporary line item selections, modifiers, and coupon codes prior to authoritative checkout.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="cart_sessions",
        help_text="Restaurant tenant where cart is open"
    )
    customer = models.ForeignKey(
        Customer,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="cart_sessions",
        help_text="Linked authenticated customer account"
    )
    guest_session_id = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Client browser session identifier for guest diners"
    )
    table = models.ForeignKey(
        RestaurantTable,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="cart_sessions",
        help_text="Assigned dining table for QR table orders"
    )
    order_type = models.CharField(
        max_length=20,
        default="DINE_IN",
        help_text="Intended fulfillment type (DINE_IN, TAKEAWAY)"
    )
    items_json = models.JSONField(
        default=list,
        blank=True,
        help_text="Serialized cart item payloads: [{menu_item_id, quantity, notes, modifiers}]"
    )
    coupon_code = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Applied voucher/coupon code"
    )
    special_instructions = models.TextField(
        blank=True,
        default="",
        help_text="General order instructions"
    )
    expires_at = models.DateTimeField(
        db_index=True,
        help_text="Cart session expiration timestamp"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True
    )

    class Meta:
        verbose_name = "Cart Session"
        verbose_name_plural = "Cart Sessions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "guest_session_id"]),
            models.Index(fields=["restaurant", "customer"]),
            models.Index(fields=["expires_at", "is_active"]),
        ]

    def __str__(self):
        return f"Cart {self.id} ({self.restaurant.name}) - {self.guest_session_id}"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)
