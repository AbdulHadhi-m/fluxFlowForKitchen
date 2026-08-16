import uuid
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from apps.core.models import UUIDModel, TimeStampedModel
from apps.restaurants.models import Restaurant
from apps.accounts.models import User

class RestaurantConfiguration(UUIDModel, TimeStampedModel):
    """
    Tenant-specific operational policies, billing rules, KDS parameters, and thresholds.
    """
    restaurant = models.OneToOneField(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="operational_settings",
        help_text="Tenant owner of these operational configurations"
    )

    # --- Order Workflow Settings ---
    allow_order_cancellation = models.BooleanField(
        default=True,
        help_text="Allow staff to cancel active orders"
    )
    cancellation_window_minutes = models.PositiveIntegerField(
        default=10,
        help_text="Window in minutes during which placed orders can be voided/cancelled"
    )
    require_order_confirmation = models.BooleanField(
        default=False,
        help_text="Require manager or head waiter confirmation before dispatch to KDS"
    )
    allow_table_orders = models.BooleanField(
        default=True,
        help_text="Allow dine-in ordering by table assignment"
    )
    allow_takeaway = models.BooleanField(
        default=True,
        help_text="Allow takeaway / parcel ordering"
    )

    # --- Kitchen & KDS Settings ---
    default_prep_time_minutes = models.PositiveIntegerField(
        default=15,
        help_text="Standard preparation time target"
    )
    kds_warning_threshold_minutes = models.PositiveIntegerField(
        default=15,
        help_text="Minutes before a kitchen ticket turns amber/warning"
    )
    kds_critical_threshold_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Minutes before a kitchen ticket turns red/critical"
    )
    auto_refresh_interval_seconds = models.PositiveIntegerField(
        default=15,
        help_text="KDS polling / reconnect interval in seconds"
    )

    # --- Billing & Tax Settings ---
    tax_enabled = models.BooleanField(
        default=True,
        help_text="Whether tax calculation is enabled on bills"
    )
    default_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("5.00"),
        help_text="Default tax rate percentage (e.g. 5.00 for 5%)"
    )
    tax_name = models.CharField(
        max_length=50,
        default="GST / VAT",
        help_text="Label printed on receipts (e.g. GST, VAT, Sales Tax)"
    )
    tax_registration_number = models.CharField(
        max_length=64,
        blank=True,
        default="",
        help_text="Official Tax Registration or GSTIN number"
    )
    tax_inclusive_pricing = models.BooleanField(
        default=False,
        help_text="Menu item prices already include taxes"
    )
    invoice_prefix = models.CharField(
        max_length=10,
        default="INV",
        help_text="Prefix for finalized tax invoices"
    )
    receipt_prefix = models.CharField(
        max_length=10,
        default="RCP",
        help_text="Prefix for payment receipts"
    )
    invoice_footer_notes = models.TextField(
        blank=True,
        default="Thank you for dining with us!",
        help_text="Footer notice printed on customer receipts"
    )

    # --- Inventory & Stock Settings ---
    allow_negative_stock = models.BooleanField(
        default=False,
        help_text="Allow inventory consumption below zero"
    )
    require_wastage_reason = models.BooleanField(
        default=True,
        help_text="Require mandatory textual reason when recording stock wastage"
    )
    low_stock_threshold_default = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("10.00"),
        help_text="Default minimum quantity threshold for low-stock triggers"
    )

    # --- Procurement Settings ---
    po_approval_required = models.BooleanField(
        default=True,
        help_text="Require manager approval before purchase orders can be received"
    )
    po_approval_threshold = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("10000.00"),
        help_text="Orders above this amount strictly require manager approval"
    )
    default_delivery_lead_days = models.PositiveIntegerField(
        default=3,
        help_text="Expected delivery lead time in days for new POs"
    )

    # --- Notification Defaults ---
    inventory_alerts_enabled = models.BooleanField(default=True)
    order_alerts_enabled = models.BooleanField(default=True)
    procurement_alerts_enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Restaurant Configuration"
        verbose_name_plural = "Restaurant Configurations"

    def clean(self):
        super().clean()
        if self.kds_critical_threshold_minutes < self.kds_warning_threshold_minutes:
            raise ValidationError({
                "kds_critical_threshold_minutes": "KDS critical threshold must be greater than or equal to warning threshold."
            })
        if self.default_tax_rate < Decimal("0.00"):
            raise ValidationError({
                "default_tax_rate": "Default tax rate cannot be negative."
            })
        if self.po_approval_threshold < Decimal("0.00"):
            raise ValidationError({
                "po_approval_threshold": "Purchase order approval threshold cannot be negative."
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Settings for {self.restaurant.name}"


class UserPreference(UUIDModel, TimeStampedModel):
    """
    User-specific UI preferences, themes, and display settings.
    """
    class ThemeChoice(models.TextChoices):
        DARK = "DARK", "Dark"
        LIGHT = "LIGHT", "Light"
        SYSTEM = "SYSTEM", "System"

    class TimeFormatChoice(models.TextChoices):
        FORMAT_12H = "12H", "12-Hour (AM/PM)"
        FORMAT_24H = "24H", "24-Hour"

    class TableDensityChoice(models.TextChoices):
        COMPACT = "COMPACT", "Compact"
        COMFORTABLE = "COMFORTABLE", "Comfortable"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="preferences",
        help_text="User owner of these preferences"
    )
    theme = models.CharField(
        max_length=20,
        choices=ThemeChoice.choices,
        default=ThemeChoice.DARK
    )
    time_format = models.CharField(
        max_length=10,
        choices=TimeFormatChoice.choices,
        default=TimeFormatChoice.FORMAT_12H
    )
    date_format = models.CharField(
        max_length=20,
        default="DD/MM/YYYY"
    )
    table_density = models.CharField(
        max_length=20,
        choices=TableDensityChoice.choices,
        default=TableDensityChoice.COMFORTABLE
    )

    class Meta:
        verbose_name = "User Preference"
        verbose_name_plural = "User Preferences"

    def __str__(self):
        return f"Preferences for {self.user.email}"
