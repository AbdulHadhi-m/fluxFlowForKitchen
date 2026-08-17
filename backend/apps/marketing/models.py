import secrets
import string
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.core.models import UUIDModel, TimeStampedModel
from apps.restaurants.models import Restaurant
from apps.customers.models import Customer, CustomerTag
from apps.loyalty.models import MembershipTier
from apps.menu.models import MenuItem, MenuCategory
from apps.orders.models import Order
from apps.billing.models import Bill

class PromotionType(models.TextChoices):
    PERCENTAGE_DISCOUNT = "PERCENTAGE_DISCOUNT", "Percentage Off Total/Items"
    FIXED_DISCOUNT = "FIXED_DISCOUNT", "Fixed Currency Amount Off"
    BUY_X_GET_Y = "BUY_X_GET_Y", "Buy X Get Y"
    FREE_ITEM = "FREE_ITEM", "Complimentary Item"


class PromotionStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SCHEDULED = "SCHEDULED", "Scheduled"
    ACTIVE = "ACTIVE", "Active"
    PAUSED = "PAUSED", "Paused"
    EXPIRED = "EXPIRED", "Expired"
    ARCHIVED = "ARCHIVED", "Archived"


class AudienceTargetType(models.TextChoices):
    ALL = "ALL", "All Customers"
    SPECIFIC_CUSTOMERS = "SPECIFIC_CUSTOMERS", "Selected Customers"
    CUSTOMER_TAGS = "CUSTOMER_TAGS", "Customer Tags (e.g. VIP, Corporate)"
    CUSTOMER_SEGMENT = "CUSTOMER_SEGMENT", "Customer Segment"
    LOYALTY_TIER = "LOYALTY_TIER", "Membership Loyalty Tier"
    FIRST_ORDER = "FIRST_ORDER", "First-Time Customers"
    RETURNING = "RETURNING", "Returning Customers (2+ Orders)"
    INACTIVE_CUSTOMERS = "INACTIVE_CUSTOMERS", "Inactive Customers (Lapsed Visits)"


class ItemTargetType(models.TextChoices):
    ALL_ITEMS = "ALL_ITEMS", "Entire Order / All Items"
    SPECIFIC_ITEMS = "SPECIFIC_ITEMS", "Specific Menu Items"
    CATEGORIES = "CATEGORIES", "Specific Menu Categories"


class CustomerSegmentType(models.TextChoices):
    ALL_CUSTOMERS = "ALL_CUSTOMERS", "All Registered Customers"
    NEW_CUSTOMERS = "NEW_CUSTOMERS", "New Customers (Registered < 30 days)"
    REGULAR_CUSTOMERS = "REGULAR_CUSTOMERS", "Regular Customers (3+ Visits)"
    VIP_CUSTOMERS = "VIP_CUSTOMERS", "VIP High-Spenders"
    INACTIVE_CUSTOMERS = "INACTIVE_CUSTOMERS", "Inactive / At-Risk Customers"
    HIGH_VALUE_CUSTOMERS = "HIGH_VALUE_CUSTOMERS", "Top 10% Lifetime Spend"
    CUSTOM = "CUSTOM", "Custom Dynamic Rules"


class CustomerSegment(UUIDModel, TimeStampedModel):
    """
    Lightweight customer segmentation grouping based on dining behaviors,
    tags, lifetime spend, and visit frequencies.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="customer_segments"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    segment_type = models.CharField(
        max_length=30,
        choices=CustomerSegmentType.choices,
        default=CustomerSegmentType.CUSTOM
    )
    # Dynamic behavioral thresholds
    min_spend = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Minimum total lifetime spend required"
    )
    min_visits = models.PositiveIntegerField(
        default=0,
        help_text="Minimum dining visits count required"
    )
    inactive_days = models.PositiveIntegerField(
        default=0,
        help_text="Days since last dining visit to consider lapsed/inactive"
    )
    tags = models.ManyToManyField(
        CustomerTag,
        related_name="targeted_segments",
        blank=True
    )
    loyalty_tiers = models.ManyToManyField(
        MembershipTier,
        related_name="targeted_segments",
        blank=True
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Customer Segment"
        verbose_name_plural = "Customer Segments"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "name"],
                name="unique_segment_name_per_restaurant"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.restaurant.name})"


class ConsentChannel(models.TextChoices):
    EMAIL = "EMAIL", "Email Marketing"
    SMS = "SMS", "SMS Text Message"
    PUSH = "PUSH", "In-App Push Notification"


class ConsentStatus(models.TextChoices):
    GRANTED = "GRANTED", "Opted In (Granted)"
    REVOKED = "REVOKED", "Opted Out (Revoked)"


class MarketingConsent(UUIDModel, TimeStampedModel):
    """
    Customer marketing communication opt-in/opt-out status ledger.
    Tracks explicit customer consent per channel for compliance and privacy.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="marketing_consents"
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="marketing_consents"
    )
    channel = models.CharField(
        max_length=20,
        choices=ConsentChannel.choices,
        default=ConsentChannel.EMAIL
    )
    status = models.CharField(
        max_length=20,
        choices=ConsentStatus.choices,
        default=ConsentStatus.GRANTED
    )
    source = models.CharField(
        max_length=100,
        default="POS_REGISTRATION",
        help_text="Origin of consent (e.g. POS, ONLINE_BOOKING, CUSTOMER_PORTAL)"
    )
    granted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Marketing Consent"
        verbose_name_plural = "Marketing Consents"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "customer", "channel"],
                name="unique_customer_channel_consent"
            ),
        ]

    def __str__(self):
        return f"{self.customer.full_name} [{self.channel}]: {self.status}"


class Promotion(UUIDModel, TimeStampedModel):
    """
    Core promotional discount rule entity supporting percentage, fixed amounts,
    item targeting, customer audience targeting, usage caps, and scheduling.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="promotions"
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    promotion_type = models.CharField(
        max_length=30,
        choices=PromotionType.choices,
        default=PromotionType.PERCENTAGE_DISCOUNT
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Percentage value (0-100) or fixed currency amount"
    )
    status = models.CharField(
        max_length=20,
        choices=PromotionStatus.choices,
        default=PromotionStatus.DRAFT,
        db_index=True
    )
    start_at = models.DateTimeField(db_index=True)
    end_at = models.DateTimeField(null=True, blank=True, db_index=True)
    priority = models.PositiveIntegerField(
        default=10,
        help_text="Evaluation priority: higher number evaluated first (e.g. 100 > 10)"
    )
    stackable = models.BooleanField(
        default=False,
        help_text="Can be stacked alongside other non-coupon discounts"
    )
    coupon_required = models.BooleanField(
        default=False,
        help_text="Requires valid coupon code entry at checkout"
    )

    # Order financial thresholds
    min_order_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Minimum subtotal spend required to activate promotion"
    )
    max_discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Ceiling cap on calculated percentage discounts"
    )

    # Usage limits and counters
    total_usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum total times this promotion can be redeemed (null for unlimited)"
    )
    per_customer_limit = models.PositiveIntegerField(
        default=1,
        help_text="Maximum redemptions allowed per individual customer"
    )
    daily_usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum redemptions allowed in a single calendar day"
    )
    current_usage_count = models.PositiveIntegerField(default=0)

    # Customer targeting
    target_audience_type = models.CharField(
        max_length=30,
        choices=AudienceTargetType.choices,
        default=AudienceTargetType.ALL
    )
    target_segment = models.ForeignKey(
        CustomerSegment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="promotions"
    )
    target_customers = models.ManyToManyField(
        Customer,
        related_name="targeted_promotions",
        blank=True
    )
    target_tags = models.ManyToManyField(
        CustomerTag,
        related_name="targeted_promotions",
        blank=True
    )
    target_loyalty_tiers = models.ManyToManyField(
        MembershipTier,
        related_name="targeted_promotions",
        blank=True
    )
    target_inactive_days = models.PositiveIntegerField(
        default=60,
        help_text="Days of dining inactivity required for INACTIVE_CUSTOMERS targeting"
    )

    # Catalog item targeting
    target_item_type = models.CharField(
        max_length=20,
        choices=ItemTargetType.choices,
        default=ItemTargetType.ALL_ITEMS
    )
    target_menu_items = models.ManyToManyField(
        MenuItem,
        related_name="promotions",
        blank=True
    )
    target_categories = models.ManyToManyField(
        MenuCategory,
        related_name="promotions",
        blank=True
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_promotions"
    )

    class Meta:
        verbose_name = "Promotion"
        verbose_name_plural = "Promotions"
        ordering = ["-priority", "-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "status", "start_at", "end_at"]),
            models.Index(fields=["restaurant", "coupon_required", "status"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_promotion_type_display()}) [{self.status}]"

    def is_currently_active(self, current_time=None) -> bool:
        now = current_time or timezone.now()
        if self.status != PromotionStatus.ACTIVE:
            return False
        if self.start_at > now:
            return False
        if self.end_at and self.end_at < now:
            return False
        if self.total_usage_limit is not None and self.current_usage_count >= self.total_usage_limit:
            return False
        return True


class CouponStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    DISABLED = "DISABLED", "Disabled"
    EXPIRED = "EXPIRED", "Expired"


class Coupon(UUIDModel, TimeStampedModel):
    """
    Voucher coupon code redeemable for a parent promotional discount.
    Enforces restaurant-unique codes and separate usage limits.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="coupons"
    )
    promotion = models.ForeignKey(
        Promotion,
        on_delete=models.CASCADE,
        related_name="coupons"
    )
    code = models.CharField(max_length=32, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=CouponStatus.choices,
        default=CouponStatus.ACTIVE,
        db_index=True
    )
    usage_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum total times this coupon code can be redeemed"
    )
    per_customer_limit = models.PositiveIntegerField(
        default=1,
        help_text="Maximum times this coupon code can be redeemed per customer"
    )
    current_usage_count = models.PositiveIntegerField(default=0)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Coupon"
        verbose_name_plural = "Coupons"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "code"],
                name="unique_coupon_code_per_restaurant"
            ),
        ]
        indexes = [
            models.Index(fields=["restaurant", "code", "status"]),
        ]

    def __str__(self):
        return f"{self.code} -> {self.promotion.name}"

    @classmethod
    def generate_secure_code(cls, prefix: str = "SAVE", length: int = 6) -> str:
        chars = string.ascii_uppercase + string.digits
        # Remove ambiguous chars (0, O, 1, I)
        chars = chars.replace("0", "").replace("O", "").replace("1", "").replace("I", "")
        suffix = "".join(secrets.choice(chars) for _ in range(length))
        return f"{prefix}{suffix}"

    def is_currently_valid(self, current_time=None) -> bool:
        now = current_time or timezone.now()
        if self.status != CouponStatus.ACTIVE:
            return False
        if self.valid_from > now:
            return False
        if self.valid_until and self.valid_until < now:
            return False
        if self.usage_limit is not None and self.current_usage_count >= self.usage_limit:
            return False
        return self.promotion.is_currently_active(current_time=now)


class PromotionUsage(UUIDModel, TimeStampedModel):
    """
    Immutable audit record of a redeemed promotion/coupon against a finalized order or bill.
    Tracks reversals when orders are cancelled or refunded.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="promotion_usages"
    )
    promotion = models.ForeignKey(
        Promotion,
        on_delete=models.PROTECT,
        related_name="usages"
    )
    coupon = models.ForeignKey(
        Coupon,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="usages"
    )
    customer = models.ForeignKey(
        Customer,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="promotion_usages"
    )
    order = models.ForeignKey(
        Order,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="promotion_usages"
    )
    bill = models.ForeignKey(
        Bill,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="promotion_usages"
    )
    discount_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Authoritative currency amount discounted"
    )
    redeemed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="processed_promotion_usages"
    )
    is_reversed = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True if order was cancelled or voided and redemption reversed"
    )
    reversed_at = models.DateTimeField(null=True, blank=True)
    reversal_reason = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Promotion Usage"
        verbose_name_plural = "Promotion Usages"
        ordering = ["-redeemed_at"]
        indexes = [
            models.Index(fields=["restaurant", "promotion", "customer", "is_reversed"]),
            models.Index(fields=["restaurant", "coupon", "customer", "is_reversed"]),
            models.Index(fields=["restaurant", "order", "is_reversed"]),
        ]

    def __str__(self):
        return f"{self.promotion.name}: -{self.discount_amount} (Order: {self.order_id})"


class CampaignStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SCHEDULED = "SCHEDULED", "Scheduled"
    RUNNING = "RUNNING", "Running"
    PAUSED = "PAUSED", "Paused"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class CampaignChannel(models.TextChoices):
    IN_APP = "IN_APP", "In-App Notification Banner"
    EMAIL = "EMAIL", "Email Broadcast"
    SMS = "SMS", "SMS Text Alert"


class Campaign(UUIDModel, TimeStampedModel):
    """
    Marketing outbound activity campaign delivering messages, vouchers,
    and promotional notifications to customer segments.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="campaigns"
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=CampaignStatus.choices,
        default=CampaignStatus.DRAFT,
        db_index=True
    )
    promotion = models.ForeignKey(
        Promotion,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="campaigns"
    )
    target_segment = models.ForeignKey(
        CustomerSegment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="campaigns"
    )
    channel = models.CharField(
        max_length=20,
        choices=CampaignChannel.choices,
        default=CampaignChannel.IN_APP
    )
    title = models.CharField(max_length=200, help_text="Headline or email subject")
    message_template = models.TextField(help_text="Marketing message content body")
    start_at = models.DateTimeField(db_index=True)
    end_at = models.DateTimeField(null=True, blank=True)

    # Telemetry and delivery counters
    sent_count = models.PositiveIntegerField(default=0)
    delivered_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    skipped_count = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_campaigns"
    )

    class Meta:
        verbose_name = "Marketing Campaign"
        verbose_name_plural = "Marketing Campaigns"
        ordering = ["-start_at", "-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "status", "start_at"]),
        ]

    def __str__(self):
        return f"{self.name} [{self.status}] ({self.channel})"


class CampaignDeliveryStatus(models.TextChoices):
    SENT = "SENT", "Sent"
    DELIVERED = "DELIVERED", "Delivered"
    FAILED = "FAILED", "Failed"
    SKIPPED = "SKIPPED", "Skipped (No Consent / Inactive)"


class CampaignDeliveryLog(UUIDModel):
    """
    Idempotent delivery audit log ensuring zero duplicate messages per campaign recipient.
    """
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name="delivery_logs"
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="campaign_delivery_logs"
    )
    channel = models.CharField(max_length=20)
    status = models.CharField(
        max_length=20,
        choices=CampaignDeliveryStatus.choices,
        default=CampaignDeliveryStatus.SENT
    )
    failure_reason = models.TextField(blank=True, default="")
    idempotency_key = models.CharField(
        max_length=128,
        unique=True,
        db_index=True,
        help_text="Unique key ensuring idempotency: {campaign_id}:{customer_id}:{channel}"
    )
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Campaign Delivery Log"
        verbose_name_plural = "Campaign Delivery Logs"
        ordering = ["-sent_at"]
        indexes = [
            models.Index(fields=["campaign", "status"]),
            models.Index(fields=["customer", "status"]),
        ]

    def __str__(self):
        return f"Campaign {self.campaign_id} -> {self.customer.full_name}: {self.status}"
