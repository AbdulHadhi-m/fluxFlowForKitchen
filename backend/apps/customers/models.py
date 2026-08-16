import uuid
from decimal import Decimal
from django.db import models
from apps.core.models import UUIDModel, TimeStampedModel
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable

class CustomerTag(UUIDModel, TimeStampedModel):
    """
    Categorical segmentation tags (e.g., VIP, Regular, Corporate, High Spender).
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="customer_tags"
    )
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=20, default="indigo")

    class Meta:
        verbose_name = "Customer Tag"
        verbose_name_plural = "Customer Tags"
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "name"], name="unique_tag_per_restaurant"),
        ]

    def __str__(self):
        return f"{self.name} ({self.restaurant.name})"


class Customer(UUIDModel, TimeStampedModel):
    """
    Customer profile maintaining dining history, preferences, and segmentation tags.
    """
    class GenderChoices(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"
        UNSPECIFIED = "UNSPECIFIED", "Unspecified"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="customers"
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=30, db_index=True)
    email = models.EmailField(max_length=255, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=GenderChoices.choices,
        default=GenderChoices.UNSPECIFIED
    )

    # Preferences
    preferred_table = models.ForeignKey(
        RestaurantTable,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="preferred_by_customers"
    )
    dietary_preferences = models.JSONField(default=list, blank=True)
    allergies = models.JSONField(default=list, blank=True)
    tags = models.ManyToManyField(CustomerTag, related_name="customers", blank=True)
    internal_notes = models.TextField(blank=True, default="")

    # Analytics aggregates
    total_visits = models.PositiveIntegerField(default=0)
    total_spend = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    last_visit_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
        ordering = ["-last_visit_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "phone"], name="unique_customer_phone_per_restaurant"),
        ]

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.full_name} ({self.phone})"


class CustomerVisit(UUIDModel, TimeStampedModel):
    """
    Log of individual dining visits, connecting customer to orders and tables.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="customer_visits"
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="visits"
    )
    table = models.ForeignKey(
        RestaurantTable,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="customer_visits"
    )
    order_id = models.UUIDField(null=True, blank=True, db_index=True)
    party_size = models.PositiveIntegerField(default=2)
    spend_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Customer Visit"
        verbose_name_plural = "Customer Visits"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Visit by {self.customer.full_name} on {self.created_at.strftime('%Y-%m-%d')}"


class ReservationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    CHECKED_IN = "CHECKED_IN", "Checked In"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    NO_SHOW = "NO_SHOW", "No Show"


class Reservation(UUIDModel, TimeStampedModel):
    """
    Dining table booking with conflict prevention and capacity awareness.
    """
    reservation_number = models.CharField(max_length=32, db_index=True)
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="reservations"
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="reservations"
    )
    table = models.ForeignKey(
        RestaurantTable,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reservations"
    )
    reservation_date = models.DateField(db_index=True)
    reservation_time = models.TimeField()
    party_size = models.PositiveIntegerField(default=2)
    status = models.CharField(
        max_length=20,
        choices=ReservationStatus.choices,
        default=ReservationStatus.CONFIRMED,
        db_index=True
    )
    special_requests = models.TextField(blank=True, default="")
    cancellation_reason = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Reservation"
        verbose_name_plural = "Reservations"
        ordering = ["reservation_date", "reservation_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "reservation_number"],
                name="unique_reservation_number_per_restaurant"
            ),
        ]

    def __str__(self):
        return f"{self.reservation_number} - {self.customer.full_name} ({self.reservation_date} {self.reservation_time})"
