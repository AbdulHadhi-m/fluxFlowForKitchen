from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.menu.models import MenuItem
from apps.orders.models import Order

class UnitOfMeasure(models.TextChoices):
    KG = "kg", "Kilogram (kg)"
    G = "g", "Gram (g)"
    L = "l", "Liter (l)"
    ML = "ml", "Milliliter (ml)"
    PIECE = "piece", "Piece (pc)"
    PACK = "pack", "Pack"
    BOTTLE = "bottle", "Bottle"
    BOX = "box", "Box"

class InventoryItem(UUIDModel, TimeStampedModel, StatusModel):
    """
    Raw material / ingredient inventory tracked per restaurant tenant.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="inventory_items",
        help_text="Restaurant owning this inventory stock"
    )
    name = models.CharField(
        max_length=200,
        help_text="Ingredient name (e.g. Basmati Rice, Chicken Breast, Extra Virgin Olive Oil)"
    )
    sku = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Stock keeping unit barcode or internal code"
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices,
        default=UnitOfMeasure.KG,
        help_text="Primary unit of measurement for stock tracking"
    )
    current_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        help_text="Current available stock balance"
    )
    minimum_stock_level = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("5.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
        help_text="Reorder threshold below which status becomes LOW_STOCK"
    )
    cost_per_unit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Average purchase cost per unit"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Soft-deactivation flag"
    )

    class Meta:
        verbose_name = "Inventory Item"
        verbose_name_plural = "Inventory Items"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "name"], name="unique_inventory_item_per_restaurant"),
        ]
        indexes = [
            models.Index(fields=["restaurant", "is_active"]),
        ]

    @property
    def stock_status(self) -> str:
        if self.current_quantity <= Decimal("0.000"):
            return "OUT_OF_STOCK"
        if self.current_quantity <= self.minimum_stock_level:
            return "LOW_STOCK"
        return "IN_STOCK"

    def __str__(self):
        return f"{self.name} ({self.current_quantity} {self.unit}) - {self.restaurant.name}"

class StockMovement(UUIDModel, TimeStampedModel, StatusModel):
    """
    Immutable audit ledger of every inventory change (purchases, adjustments, consumptions, wastage).
    """
    class MovementType(models.TextChoices):
        OPENING = "OPENING", "Opening Stock"
        PURCHASE = "PURCHASE", "Purchase / Stock Intake"
        ADJUSTMENT_IN = "ADJUSTMENT_IN", "Positive Adjustment"
        ADJUSTMENT_OUT = "ADJUSTMENT_OUT", "Negative Adjustment"
        CONSUMPTION = "CONSUMPTION", "Order Recipe Consumption"
        WASTAGE = "WASTAGE", "Wastage / Spoilage"
        RETURN = "RETURN", "Return / Compensation"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="stock_movements",
        help_text="Restaurant organization"
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="movements",
        help_text="Target inventory item"
    )
    movement_type = models.CharField(
        max_length=30,
        choices=MovementType.choices,
        db_index=True,
        help_text="Type of stock transaction"
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        help_text="Quantity delta applied (signed: positive or negative)"
    )
    quantity_before = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        help_text="Stock quantity balance prior to movement"
    )
    quantity_after = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        help_text="Stock quantity balance after movement"
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices,
        help_text="Unit of measurement used"
    )
    reference_type = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Reference category (e.g. ORDER, MANUAL, WASTAGE)"
    )
    reference_id = models.CharField(
        max_length=128,
        blank=True,
        default="",
        help_text="Source identifier (e.g. Order UUID or ORD-000123)"
    )
    reason = models.TextField(
        blank=True,
        default="",
        help_text="Staff remarks or wastage reason"
    )
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="recorded_stock_movements",
        help_text="Employee who performed the stock action"
    )

    class Meta:
        verbose_name = "Stock Movement"
        verbose_name_plural = "Stock Movements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "movement_type"]),
            models.Index(fields=["restaurant", "created_at"]),
            models.Index(fields=["item", "created_at"]),
        ]

    def __str__(self):
        return f"{self.movement_type} {self.quantity} {self.unit} for {self.item.name}"

class Recipe(UUIDModel, TimeStampedModel, StatusModel):
    """
    Bill of Materials (BOM) linking a catalog MenuItem to its required raw material ingredients.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="recipes"
    )
    menu_item = models.OneToOneField(
        MenuItem,
        on_delete=models.CASCADE,
        related_name="recipe",
        help_text="Catalog menu item prepared by this recipe"
    )
    yield_quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Number of dish portions produced by this recipe"
    )
    instructions = models.TextField(
        blank=True,
        default="",
        help_text="Preparation / cooking instructions"
    )

    class Meta:
        verbose_name = "Recipe"
        verbose_name_plural = "Recipes"

    def __str__(self):
        return f"Recipe for {self.menu_item.name} ({self.restaurant.name})"

class RecipeItem(UUIDModel, TimeStampedModel, StatusModel):
    """
    Single ingredient requirement in a Recipe.
    """
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name="ingredients"
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="recipe_usages"
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Quantity of ingredient consumed per recipe portion"
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices,
        help_text="Measurement unit for the ingredient"
    )

    class Meta:
        verbose_name = "Recipe Ingredient"
        verbose_name_plural = "Recipe Ingredients"
        constraints = [
            models.UniqueConstraint(fields=["recipe", "inventory_item"], name="unique_recipe_ingredient"),
        ]

    def __str__(self):
        return f"{self.quantity} {self.unit} {self.inventory_item.name}"

class InventoryConsumption(UUIDModel, TimeStampedModel, StatusModel):
    """
    Tracks order-level recipe ingredient consumption to guarantee idempotency.
    """
    class ConsumptionStatus(models.TextChoices):
        CONSUMED = "CONSUMED", "Consumed"
        REVERSED = "REVERSED", "Reversed"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="inventory_consumptions"
    )
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="inventory_consumption"
    )
    status = models.CharField(
        max_length=20,
        choices=ConsumptionStatus.choices,
        default=ConsumptionStatus.CONSUMED
    )

    class Meta:
        verbose_name = "Inventory Consumption Record"
        verbose_name_plural = "Inventory Consumption Records"

    def __str__(self):
        return f"Consumption for Order {self.order.order_number} ({self.status})"
