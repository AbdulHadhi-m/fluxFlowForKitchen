import uuid
import secrets
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant
from apps.customers.models import Customer
from apps.staff.models import StaffProfile
from apps.orders.models import Order


class CustomerAddress(UUIDModel, TimeStampedModel):
    """
    Saved delivery address notebook for registered customer CRM accounts.
    """
    class AddressLabel(models.TextChoices):
        HOME = "HOME", "Home"
        WORK = "WORK", "Work"
        OTHER = "OTHER", "Other"

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="delivery_addresses",
        help_text="Customer profile owning this saved address"
    )
    label = models.CharField(
        max_length=20,
        choices=AddressLabel.choices,
        default=AddressLabel.HOME
    )
    recipient_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, default="")
    landmark = models.CharField(max_length=150, blank=True, default="")
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, default="")
    postal_code = models.CharField(max_length=20, db_index=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Customer Address"
        verbose_name_plural = "Customer Addresses"
        ordering = ["-is_default", "-created_at"]
        indexes = [
            models.Index(fields=["customer", "is_active"]),
            models.Index(fields=["postal_code"]),
        ]

    def __str__(self):
        return f"{self.recipient_name} - {self.address_line_1}, {self.city} ({self.postal_code})"

    def save(self, *args, **kwargs):
        if self.is_default:
            # Clear default on other addresses for the same customer
            CustomerAddress.objects.filter(customer=self.customer, is_default=True).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)


class DeliveryZone(UUIDModel, TimeStampedModel, StatusModel):
    """
    Configurable restaurant geographic delivery sector with fee and minimum order rules.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="delivery_zones",
        help_text="Restaurant organization owning this delivery zone"
    )
    name = models.CharField(max_length=100, help_text="Zone display title (e.g. Downtown / Zone A)")
    description = models.TextField(blank=True, default="")
    postal_codes = models.JSONField(
        default=list,
        blank=True,
        help_text="List of matched postal codes or prefixes (e.g. ['10001', '10002', '10003'])"
    )
    fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("5.00"),
        help_text="Standard delivery charge for orders delivered to this zone"
    )
    minimum_order = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("15.00"),
        help_text="Minimum order subtotal required for delivery to this zone"
    )
    maximum_order = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Optional maximum order value cap"
    )
    estimated_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Average transit duration in minutes from restaurant to this zone"
    )
    priority = models.PositiveIntegerField(
        default=1,
        help_text="Evaluation priority order when an address matches multiple zones (higher number takes precedence)"
    )
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Delivery Zone"
        verbose_name_plural = "Delivery Zones"
        ordering = ["-priority", "name"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "name"], name="unique_zone_name_per_restaurant"),
        ]
        indexes = [
            models.Index(fields=["restaurant", "is_active"]),
            models.Index(fields=["restaurant", "priority"]),
        ]

    def __str__(self):
        return f"{self.name} (${self.fee}) - {self.restaurant.name}"


class DeliveryDriver(UUIDModel, TimeStampedModel, StatusModel):
    """
    Delivery fleet personnel linked to restaurant staff employment profiles.
    """
    class VehicleType(models.TextChoices):
        BIKE = "BIKE", "Motorcycle / Scooter"
        CAR = "CAR", "Car / Van"
        BICYCLE = "BICYCLE", "Bicycle"
        WALKER = "WALKER", "On Foot"

    class AvailabilityStatus(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        BUSY = "BUSY", "On Delivery"
        OFFLINE = "OFFLINE", "Offline"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="delivery_drivers",
        help_text="Restaurant tenant employing this courier"
    )
    staff_profile = models.OneToOneField(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name="driver_profile",
        help_text="Associated employment staff profile"
    )
    vehicle_type = models.CharField(
        max_length=20,
        choices=VehicleType.choices,
        default=VehicleType.BIKE
    )
    vehicle_number = models.CharField(max_length=50, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    availability_status = models.CharField(
        max_length=20,
        choices=AvailabilityStatus.choices,
        default=AvailabilityStatus.AVAILABLE,
        db_index=True
    )
    active_deliveries_count = models.PositiveIntegerField(default=0)
    total_completed_deliveries = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Delivery Driver"
        verbose_name_plural = "Delivery Drivers"
        ordering = ["availability_status", "staff_profile__first_name"]
        indexes = [
            models.Index(fields=["restaurant", "availability_status"]),
            models.Index(fields=["restaurant", "is_active"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.vehicle_type} - {self.availability_status})"

    @property
    def full_name(self) -> str:
        return f"{self.staff_profile.first_name} {self.staff_profile.last_name}".strip()


class Delivery(UUIDModel, TimeStampedModel, StatusModel):
    """
    Authoritative order fulfillment and dispatch record.
    Preserves immutable address snapshot and manages delivery state transitions.
    """
    class DeliveryStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Preparation"
        PREPARING = "PREPARING", "In Kitchen Preparation"
        READY_FOR_DISPATCH = "READY_FOR_DISPATCH", "Ready for Dispatch"
        ASSIGNED = "ASSIGNED", "Driver Assigned"
        PICKED_UP = "PICKED_UP", "Picked Up by Driver"
        OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for Delivery"
        DELIVERED = "DELIVERED", "Successfully Delivered"
        FAILED = "FAILED", "Delivery Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="deliveries",
        help_text="Tenant organization owning this delivery"
    )
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="delivery_fulfillment",
        help_text="Parent customer order being delivered"
    )
    customer = models.ForeignKey(
        Customer,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="deliveries",
        help_text="Linked registered customer CRM account"
    )
    zone = models.ForeignKey(
        DeliveryZone,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="deliveries",
        help_text="Matched geographic delivery zone"
    )
    assigned_driver = models.ForeignKey(
        DeliveryDriver,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_deliveries",
        help_text="Fleet courier assigned to deliver this order"
    )
    status = models.CharField(
        max_length=30,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.PENDING,
        db_index=True,
        help_text="Current operational delivery state"
    )

    # Immutable Address Snapshot
    recipient_name = models.CharField(max_length=150)
    recipient_phone = models.CharField(max_length=30)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, default="")
    landmark = models.CharField(max_length=150, blank=True, default="")
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, default="")
    postal_code = models.CharField(max_length=20, db_index=True)
    delivery_instructions = models.TextField(blank=True, default="")

    # Financial & Verification Details
    delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Authoritative delivery fee charged on this order"
    )
    delivery_pin = models.CharField(
        max_length=6,
        blank=True,
        default="",
        help_text="Cryptographically generated 4-to-6 digit delivery verification PIN"
    )

    # Operational Timestamps
    estimated_delivery_at = models.DateTimeField(null=True, blank=True, db_index=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Delivery"
        verbose_name_plural = "Deliveries"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["restaurant", "-created_at"]),
            models.Index(fields=["restaurant", "assigned_driver"]),
            models.Index(fields=["restaurant", "postal_code"]),
        ]

    def __str__(self):
        return f"Delivery #{self.order.order_number} ({self.status}) - {self.recipient_name}"

    def save(self, *args, **kwargs):
        if not self.delivery_pin:
            self.delivery_pin = f"{secrets.randbelow(9000) + 1000}"
        super().save(*args, **kwargs)


class DeliveryEvent(UUIDModel):
    """
    Append-only operational history tracking delivery transitions, driver actions, and notes.
    """
    delivery = models.ForeignKey(
        Delivery,
        on_delete=models.CASCADE,
        related_name="events",
        help_text="Delivery record being audited"
    )
    event_type = models.CharField(max_length=50, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Staff or system user who triggered this operational event"
    )
    notes = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Delivery Event"
        verbose_name_plural = "Delivery Events"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["delivery", "created_at"]),
        ]

    def __str__(self):
        return f"{self.event_type} on Delivery {self.delivery.id} at {self.created_at}"
