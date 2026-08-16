from decimal import Decimal
from django.db import models
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant

class MenuCategory(UUIDModel, TimeStampedModel, StatusModel):
    """
    Menu Category grouping operational items (e.g. Starters, Mains, Desserts, Beverages).
    Scoped strictly to a single Restaurant tenant organization.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="menu_categories",
        help_text="Restaurant organization owning this category"
    )
    name = models.CharField(
        max_length=150,
        help_text="Display title for the category"
    )
    description = models.TextField(
        blank=True,
        help_text="Optional summary or notes for category"
    )
    display_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text="Deterministic display rank in menus and POS terminals"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Indicates whether this category is active in the menu catalog"
    )

    class Meta:
        verbose_name = "Menu Category"
        verbose_name_plural = "Menu Categories"
        ordering = ["display_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "name"],
                name="unique_category_name_per_restaurant"
            ),
        ]
        indexes = [
            models.Index(fields=["restaurant", "is_active"]),
            models.Index(fields=["restaurant", "display_order"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.restaurant.name})"

class MenuItem(UUIDModel, TimeStampedModel, StatusModel):
    """
    Individual billable food or beverage item within a restaurant menu category.
    Separates catalog presence ('is_active') from immediate kitchen/service availability ('is_available').
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="menu_items",
        help_text="Restaurant organization owning this menu item"
    )
    category = models.ForeignKey(
        MenuCategory,
        on_delete=models.PROTECT,
        related_name="items",
        help_text="Assigned category for sorting, routing, and reporting"
    )
    name = models.CharField(
        max_length=200,
        help_text="Commercial item title"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed ingredients, recipe notes, or dietary descriptions"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Authoritative unit selling price in restaurant currency"
    )
    is_available = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Immediate orderability toggle (86'd / out-of-stock toggle)"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Catalog presence toggle (Inactive items are hidden from live operations)"
    )
    display_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text="Deterministic display rank within the assigned category"
    )

    class Meta:
        verbose_name = "Menu Item"
        verbose_name_plural = "Menu Items"
        ordering = ["category__display_order", "display_order", "name"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(price__gte=Decimal("0.00")),
                name="check_positive_menu_item_price"
            ),
        ]
        indexes = [
            models.Index(fields=["restaurant", "category"]),
            models.Index(fields=["restaurant", "is_available"]),
            models.Index(fields=["restaurant", "is_active"]),
            models.Index(fields=["restaurant", "display_order"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.price} ({self.restaurant.name})"
