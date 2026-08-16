from django.db import models
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant

class RestaurantTable(UUIDModel, TimeStampedModel, StatusModel):
    """
    Physical dining table entity within a restaurant floor layout.
    Maintains capacity, operational occupancy status, and floor section association.
    """
    class TableStatus(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        OCCUPIED = "OCCUPIED", "Occupied"
        RESERVED = "RESERVED", "Reserved"
        OUT_OF_SERVICE = "OUT_OF_SERVICE", "Out of Service"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="tables",
        help_text="Restaurant organization owning this table"
    )
    name = models.CharField(
        max_length=50,
        help_text="Human-readable table identifier (e.g. T01, Table 12, VIP-1)"
    )
    capacity = models.PositiveIntegerField(
        default=4,
        help_text="Seating capacity for guests (minimum 1)"
    )
    section = models.CharField(
        max_length=100,
        blank=True,
        default="Main Dining",
        help_text="Floor plan area or zone (e.g. Main Dining, Patio, Bar, Rooftop, VIP)"
    )
    status = models.CharField(
        max_length=20,
        choices=TableStatus.choices,
        default=TableStatus.AVAILABLE,
        db_index=True,
        help_text="Current operational table status"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Operational lifecycle presence (Inactive tables are hidden from floor plans)"
    )
    display_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text="Deterministic display order on POS terminals and floor grids"
    )

    class Meta:
        verbose_name = "Restaurant Table"
        verbose_name_plural = "Restaurant Tables"
        ordering = ["section", "display_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "name"],
                name="unique_table_name_per_restaurant"
            ),
            models.CheckConstraint(
                check=models.Q(capacity__gte=1),
                name="check_positive_table_capacity"
            ),
        ]
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["restaurant", "is_active"]),
            models.Index(fields=["restaurant", "section"]),
            models.Index(fields=["restaurant", "display_order"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.section} - Cap: {self.capacity}) - {self.restaurant.name}"
