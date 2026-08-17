import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
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
    PORTION = "portion", "Portion"
    PACK = "pack", "Pack"
    BOTTLE = "bottle", "Bottle"
    BOX = "box", "Box"
    OZ = "oz", "Ounce (oz)"
    LB = "lb", "Pound (lb)"


class ItemType(models.TextChoices):
    RAW_INGREDIENT = "RAW_INGREDIENT", "Raw Ingredient"
    PACKAGING = "PACKAGING", "Packaging"
    CONSUMABLE = "CONSUMABLE", "Consumable"
    SEMI_FINISHED = "SEMI_FINISHED", "Semi-Finished Good / Prep"
    FINISHED_GOOD = "FINISHED_GOOD", "Finished Good"


class StorageLocation(models.TextChoices):
    MAIN_STORE = "MAIN_STORE", "Main Storage / Warehouse"
    KITCHEN = "KITCHEN", "Kitchen Prep Line"
    BAR = "BAR", "Bar Station"
    WALK_IN_FREEZER = "WALK_IN_FREEZER", "Walk-In Freezer"
    DRY_STORAGE = "DRY_STORAGE", "Dry Storage"
    OTHER = "OTHER", "Other Location"


class StorageCondition(models.TextChoices):
    AMBIENT = "AMBIENT", "Ambient Room Temp"
    REFRIGERATED = "REFRIGERATED", "Refrigerated (0-4°C)"
    FROZEN = "FROZEN", "Frozen (-18°C)"
    DRY = "DRY", "Cool & Dry"


class InventoryItem(UUIDModel, TimeStampedModel, StatusModel):
    """
    Master inventory item and ingredient catalog tracked per restaurant tenant.
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
    item_type = models.CharField(
        max_length=30,
        choices=ItemType.choices,
        default=ItemType.RAW_INGREDIENT,
        db_index=True,
        help_text="Item classification"
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices,
        default=UnitOfMeasure.KG,
        help_text="Primary unit of measurement for stock tracking"
    )
    purchase_unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices,
        default=UnitOfMeasure.KG,
        help_text="Default purchasing unit from supplier"
    )
    purchase_to_stock_factor = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal("1.0000"),
        validators=[MinValueValidator(Decimal("0.0001"))],
        help_text="Conversion multiplier from purchase unit to stock unit (e.g. 1 Box = 24 Pieces)"
    )
    storage_location = models.CharField(
        max_length=40,
        choices=StorageLocation.choices,
        default=StorageLocation.MAIN_STORE,
        db_index=True,
        help_text="Primary physical storage location"
    )
    storage_condition = models.CharField(
        max_length=30,
        choices=StorageCondition.choices,
        default=StorageCondition.AMBIENT,
        help_text="Storage climate requirement"
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
    par_level = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("10.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
        help_text="Ideal target inventory level for replenishment planning"
    )
    max_stock_level = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("100.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
        help_text="Maximum holding capacity"
    )
    cost_per_unit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Current reference purchase cost per stock unit"
    )
    last_purchase_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Unit cost on the most recent purchase invoice"
    )
    weighted_average_cost = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
        validators=[MinValueValidator(Decimal("0.0000"))],
        help_text="Moving weighted average valuation cost per unit"
    )
    yield_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("100.00"),
        validators=[MinValueValidator(Decimal("1.00")), MaxValueValidator(Decimal("100.00"))],
        help_text="Usable yield percentage after preparation / trimming"
    )
    track_expiry = models.BooleanField(
        default=False,
        help_text="Flag indicating expiry dates must be monitored"
    )
    track_batch = models.BooleanField(
        default=False,
        help_text="Flag indicating individual batch / lot numbers must be allocated"
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
            models.Index(fields=["restaurant", "item_type"]),
            models.Index(fields=["restaurant", "storage_location"]),
        ]

    @property
    def stock_status(self) -> str:
        if self.current_quantity <= Decimal("0.000"):
            return "OUT_OF_STOCK"
        if self.current_quantity <= self.minimum_stock_level:
            return "LOW_STOCK"
        return "IN_STOCK"

    @property
    def total_valuation(self) -> Decimal:
        cost = self.weighted_average_cost if self.weighted_average_cost > 0 else self.cost_per_unit
        return (self.current_quantity * Decimal(str(cost))).quantize(Decimal("0.01"))

    def __str__(self):
        return f"{self.name} ({self.current_quantity} {self.unit}) - {self.restaurant.name}"


class InventoryBatch(UUIDModel, TimeStampedModel, StatusModel):
    """
    Specific lot/batch receipt of an inventory item with expiration date tracking.
    """
    class BatchStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        DEPLETED = "DEPLETED", "Depleted"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="inventory_batches",
        help_text="Restaurant tenant"
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="batches",
        help_text="Inventory item"
    )
    batch_number = models.CharField(
        max_length=100,
        help_text="Lot / Batch number (e.g. LOT-2026-0817-A)"
    )
    received_date = models.DateField(
        default=timezone.now,
        help_text="Date batch arrived into inventory"
    )
    expiry_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Best before / expiration date"
    )
    initial_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Original received quantity in stock units"
    )
    current_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
        help_text="Remaining quantity in stock units"
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
        help_text="Specific purchase cost per unit for this batch"
    )
    supplier_name = models.CharField(
        max_length=200,
        blank=True,
        default="",
        help_text="Supplier from which batch was procured"
    )
    storage_location = models.CharField(
        max_length=40,
        choices=StorageLocation.choices,
        default=StorageLocation.MAIN_STORE,
        help_text="Location storing this batch"
    )
    batch_status = models.CharField(
        max_length=20,
        choices=BatchStatus.choices,
        default=BatchStatus.ACTIVE,
        db_index=True
    )

    class Meta:
        verbose_name = "Inventory Batch"
        verbose_name_plural = "Inventory Batches"
        ordering = ["expiry_date", "created_at"]
        indexes = [
            models.Index(fields=["restaurant", "batch_status"]),
            models.Index(fields=["item", "expiry_date"]),
        ]

    def __str__(self):
        return f"{self.item.name} [{self.batch_number}] - {self.current_quantity} {self.item.unit}"


class StockMovement(UUIDModel, TimeStampedModel, StatusModel):
    """
    Immutable audit ledger of every inventory change.
    """
    class MovementType(models.TextChoices):
        OPENING = "OPENING", "Opening Stock"
        PURCHASE = "PURCHASE", "Purchase / Stock Intake"
        ADJUSTMENT_IN = "ADJUSTMENT_IN", "Positive Adjustment"
        ADJUSTMENT_OUT = "ADJUSTMENT_OUT", "Negative Adjustment"
        CONSUMPTION = "CONSUMPTION", "Order Recipe Consumption"
        WASTAGE = "WASTAGE", "Wastage / Scrap"
        SPOILAGE = "SPOILAGE", "Expired / Spoilage"
        RETURN = "RETURN", "Return / Compensation"
        TRANSFER_IN = "TRANSFER_IN", "Transfer Received"
        TRANSFER_OUT = "TRANSFER_OUT", "Transfer Dispatched"
        PRODUCTION_IN = "PRODUCTION_IN", "Production Yield In"
        PRODUCTION_OUT = "PRODUCTION_OUT", "Production BOM Consumed"

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
    batch = models.ForeignKey(
        InventoryBatch,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="movements",
        help_text="Specific batch impacted"
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
    unit_cost_snapshot = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
        help_text="Historical cost per unit at transaction time"
    )
    reference_type = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Reference category (e.g. ORDER, MANUAL, WASTAGE, TRANSFER, COUNT)"
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
    Bill of Materials (BOM) for menu items or intermediate kitchen prep sub-recipes.
    Supports recipe versioning and yield adjustments.
    """
    class RecipeStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        ARCHIVED = "ARCHIVED", "Archived"

    class RecipeType(models.TextChoices):
        MENU_ITEM_RECIPE = "MENU_ITEM_RECIPE", "Menu Item Dish BOM"
        SUB_RECIPE = "SUB_RECIPE", "Sub-Recipe / Sauce / Patty Prep"
        PREPARATION_BATCH = "PREPARATION_BATCH", "Bulk Preparation Batch"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="recipes"
    )
    name = models.CharField(
        max_length=200,
        default="",
        help_text="Descriptive recipe / preparation name"
    )
    version = models.PositiveIntegerField(
        default=1,
        help_text="Sequential version number (e.g. 1, 2, 3)"
    )
    status = models.CharField(
        max_length=20,
        choices=RecipeStatus.choices,
        default=RecipeStatus.PUBLISHED,
        db_index=True
    )
    recipe_type = models.CharField(
        max_length=30,
        choices=RecipeType.choices,
        default=RecipeType.MENU_ITEM_RECIPE,
        db_index=True
    )
    menu_item = models.ForeignKey(
        MenuItem,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="recipes",
        help_text="Associated menu catalog item (if dish BOM)"
    )
    output_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal("1.000"),
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Total portion count or output weight/volume generated"
    )
    output_unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices,
        default=UnitOfMeasure.PORTION,
        help_text="Unit of recipe output"
    )
    yield_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("100.00"),
        validators=[MinValueValidator(Decimal("1.00")), MaxValueValidator(Decimal("100.00"))],
        help_text="Net usable yield percentage"
    )
    preparation_loss_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("99.00"))],
        help_text="Expected trim/peeling loss percentage"
    )
    cooking_loss_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("99.00"))],
        help_text="Moisture / cooking shrinkage loss percentage"
    )
    effective_from = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when version becomes active"
    )
    effective_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when version is deprecated"
    )
    instructions = models.TextField(
        blank=True,
        default="",
        help_text="Preparation / cooking instructions"
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Chef / kitchen internal notes"
    )
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_recipes"
    )

    class Meta:
        verbose_name = "Recipe"
        verbose_name_plural = "Recipes"
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["menu_item", "status"]),
        ]

    def __str__(self):
        title = self.name or (self.menu_item.name if self.menu_item else "Untitled Recipe")
        return f"{title} v{self.version} ({self.status}) - {self.restaurant.name}"


class RecipeItem(UUIDModel, TimeStampedModel, StatusModel):
    """
    Single ingredient requirement in a Recipe (links to raw InventoryItem OR sub Recipe).
    """
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name="ingredients"
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="recipe_usages",
        help_text="Raw material ingredient (if direct item)"
    )
    sub_recipe = models.ForeignKey(
        Recipe,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="parent_recipe_usages",
        help_text="Sub-recipe component (if nested prep BOM)"
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Quantity consumed per recipe batch output"
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices,
        help_text="Measurement unit for the ingredient"
    )
    preparation_notes = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Specific cut or prep note (e.g. diced, chopped finely)"
    )

    class Meta:
        verbose_name = "Recipe Ingredient"
        verbose_name_plural = "Recipe Ingredients"

    def __str__(self):
        target = self.inventory_item.name if self.inventory_item else (self.sub_recipe.name if self.sub_recipe else "Unknown")
        return f"{self.quantity} {self.unit} {target}"


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


class StockCount(UUIDModel, TimeStampedModel, StatusModel):
    """
    Physical stock audit and count session.
    """
    class CountStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        SUBMITTED = "SUBMITTED", "Submitted for Approval"
        APPROVED = "APPROVED", "Approved & Reconciled"
        CANCELLED = "CANCELLED", "Cancelled"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="stock_counts"
    )
    count_number = models.CharField(
        max_length=32,
        help_text="Audit session identifier (e.g. SC-000101)"
    )
    status = models.CharField(
        max_length=20,
        choices=CountStatus.choices,
        default=CountStatus.DRAFT,
        db_index=True
    )
    location = models.CharField(
        max_length=40,
        default="ALL",
        help_text="Target storage location or ALL"
    )
    category = models.CharField(
        max_length=40,
        default="ALL",
        help_text="Item category or ALL"
    )
    counted_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="submitted_stock_counts"
    )
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_stock_counts"
    )
    counted_at = models.DateTimeField(
        null=True,
        blank=True
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True
    )
    notes = models.TextField(
        blank=True,
        default=""
    )

    class Meta:
        verbose_name = "Stock Count"
        verbose_name_plural = "Stock Counts"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "count_number"], name="unique_count_number_per_restaurant"),
        ]

    def __str__(self):
        return f"{self.count_number} ({self.status}) - {self.restaurant.name}"


class StockCountItem(UUIDModel, TimeStampedModel, StatusModel):
    """
    Individual item audit record within a physical stock count session.
    """
    stock_count = models.ForeignKey(
        StockCount,
        on_delete=models.CASCADE,
        related_name="items"
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="count_records"
    )
    system_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        help_text="Expected book quantity at count creation"
    )
    counted_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        help_text="Physically counted quantity"
    )
    variance_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        help_text="Counted minus system quantity"
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
        help_text="Unit cost applied for variance valuation"
    )
    variance_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Monetary value of variance (variance_quantity * unit_cost)"
    )
    notes = models.TextField(
        blank=True,
        default=""
    )

    class Meta:
        verbose_name = "Stock Count Item"
        verbose_name_plural = "Stock Count Items"

    def __str__(self):
        return f"{self.item.name}: Sys {self.system_quantity} | Counted {self.counted_quantity}"


class InventoryTransfer(UUIDModel, TimeStampedModel, StatusModel):
    """
    Internal inventory movement between restaurant storage locations.
    """
    class TransferStatus(models.TextChoices):
        REQUESTED = "REQUESTED", "Requested"
        APPROVED = "APPROVED", "Approved"
        IN_TRANSIT = "IN_TRANSIT", "In Transit"
        RECEIVED = "RECEIVED", "Received & Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="inventory_transfers"
    )
    transfer_number = models.CharField(
        max_length=32,
        help_text="Sequential transfer identifier (e.g. TR-000101)"
    )
    source_location = models.CharField(
        max_length=40,
        choices=StorageLocation.choices,
        default=StorageLocation.MAIN_STORE
    )
    destination_location = models.CharField(
        max_length=40,
        choices=StorageLocation.choices,
        default=StorageLocation.KITCHEN
    )
    status = models.CharField(
        max_length=20,
        choices=TransferStatus.choices,
        default=TransferStatus.REQUESTED,
        db_index=True
    )
    requested_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="requested_transfers"
    )
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="approved_transfers"
    )
    received_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="received_transfers"
    )
    requested_at = models.DateTimeField(
        default=timezone.now
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True
    )
    received_at = models.DateTimeField(
        null=True,
        blank=True
    )
    notes = models.TextField(
        blank=True,
        default=""
    )

    class Meta:
        verbose_name = "Inventory Transfer"
        verbose_name_plural = "Inventory Transfers"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "transfer_number"], name="unique_transfer_number_per_restaurant"),
        ]

    def __str__(self):
        return f"{self.transfer_number} [{self.source_location} -> {self.destination_location}] - {self.status}"


class InventoryTransferItem(UUIDModel, TimeStampedModel, StatusModel):
    """
    Line item inside an internal inventory transfer.
    """
    transfer = models.ForeignKey(
        InventoryTransfer,
        on_delete=models.CASCADE,
        related_name="items"
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="transfer_items"
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))]
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices
    )
    notes = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )

    class Meta:
        verbose_name = "Inventory Transfer Item"
        verbose_name_plural = "Inventory Transfer Items"

    def __str__(self):
        return f"{self.quantity} {self.unit} of {self.item.name}"


class WasteRecord(UUIDModel, TimeStampedModel, StatusModel):
    """
    Detailed shrinkage, spoilage, and preparation loss log.
    """
    class WasteReason(models.TextChoices):
        SPOILAGE = "SPOILAGE", "Expired / Spoiled"
        PREPARATION_WASTE = "PREPARATION_WASTE", "Preparation / Trimming Waste"
        DAMAGED = "DAMAGED", "Damaged / Dropped"
        SPILLAGE = "SPILLAGE", "Spillage / Accident"
        OVER_PORTIONING = "OVER_PORTIONING", "Over-Portioning Loss"
        BURNT_OVERCOOKED = "BURNT_OVERCOOKED", "Burnt / Cooking Error"
        CUSTOMER_RETURN = "CUSTOMER_RETURN", "Customer Plate Return"
        OTHER = "OTHER", "Other Reason"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="waste_records"
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name="waste_records"
    )
    batch = models.ForeignKey(
        InventoryBatch,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="waste_records"
    )
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))]
    )
    unit = models.CharField(
        max_length=20,
        choices=UnitOfMeasure.choices
    )
    reason = models.CharField(
        max_length=30,
        choices=WasteReason.choices,
        default=WasteReason.SPOILAGE,
        db_index=True
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
        help_text="Unit cost applied to calculate shrinkage loss"
    )
    total_loss_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Financial loss value (quantity * unit_cost)"
    )
    location = models.CharField(
        max_length=40,
        choices=StorageLocation.choices,
        default=StorageLocation.KITCHEN
    )
    reported_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reported_waste_records"
    )
    notes = models.TextField(
        blank=True,
        default=""
    )

    class Meta:
        verbose_name = "Waste Record"
        verbose_name_plural = "Waste Records"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "reason"]),
            models.Index(fields=["restaurant", "created_at"]),
        ]

    def __str__(self):
        return f"{self.item.name} - {self.quantity} {self.unit} wasted ({self.reason}) [${self.total_loss_cost}]"
