from django.db import models
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant
from apps.orders.models import Order

class KitchenTicket(UUIDModel, TimeStampedModel, StatusModel):
    """
    Operational kitchen preparation ticket corresponding to a customer Order.
    Tracks live preparation stage, bump bar timestamps, and kitchen priority.
    """
    class KitchenStatus(models.TextChoices):
        NEW = "NEW", "New"
        PREPARING = "PREPARING", "Preparing"
        READY = "READY", "Ready"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="kitchen_tickets",
        help_text="Restaurant organization owning this kitchen ticket"
    )
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="kitchen_ticket",
        help_text="Source customer order record"
    )
    status = models.CharField(
        max_length=20,
        choices=KitchenStatus.choices,
        default=KitchenStatus.NEW,
        db_index=True,
        help_text="Current kitchen preparation state"
    )
    priority = models.PositiveIntegerField(
        default=0,
        help_text="Preparation priority (0=Normal, 1=High, 2=Rush/VIP)"
    )
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when kitchen staff started meal preparation"
    )
    ready_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when meal preparation finished and was placed on pass"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when order was served/collected by waiter"
    )

    class Meta:
        verbose_name = "Kitchen Ticket"
        verbose_name_plural = "Kitchen Tickets"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["restaurant", "created_at"]),
        ]

    def __str__(self):
        return f"Ticket {self.order.order_number} ({self.status}) - {self.restaurant.name}"
