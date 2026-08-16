import uuid
import secrets
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import UUIDModel, TimeStampedModel
from apps.restaurants.models import Restaurant
from apps.customers.models import Customer

class ProgramStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    PAUSED = "PAUSED", "Paused"
    ARCHIVED = "ARCHIVED", "Archived"


class LoyaltyProgram(UUIDModel, TimeStampedModel):
    """
    Central loyalty and reward rules configuration for a restaurant tenant.
    """
    restaurant = models.OneToOneField(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="loyalty_program"
    )
    name = models.CharField(max_length=100, default="Rewards & VIP Club")
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=ProgramStatus.choices,
        default=ProgramStatus.ACTIVE
    )
    points_enabled = models.BooleanField(default=True)
    earning_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal("1.00"),
        help_text="Points earned per 1.00 base spend currency"
    )
    redemption_enabled = models.BooleanField(default=True)
    redemption_rate = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        default=Decimal("0.0500"),
        help_text="Monetary value per 1 point (e.g. 0.05 = 100 points -> $5.00)"
    )
    min_points_redemption = models.PositiveIntegerField(default=50)
    points_expiration_enabled = models.BooleanField(default=False)
    points_expiration_days = models.PositiveIntegerField(default=365)

    class Meta:
        verbose_name = "Loyalty Program"
        verbose_name_plural = "Loyalty Programs"

    def __str__(self):
        return f"{self.name} ({self.restaurant.name})"


class MembershipTier(UUIDModel, TimeStampedModel):
    """
    Tier-based perks (e.g., Bronze, Silver, Gold, Platinum) with spend multipliers.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="membership_tiers"
    )
    name = models.CharField(max_length=50)
    rank = models.PositiveIntegerField(help_text="Ordering rank: 1 is lowest/starter tier")
    qualification_spend = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Lifetime spend required to qualify for this tier"
    )
    points_multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=Decimal("1.00"),
        help_text="Points earning multiplier (e.g. 1.25x)"
    )
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Permanent member discount percentage on orders"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Membership Tier"
        verbose_name_plural = "Membership Tiers"
        ordering = ["rank"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "name"], name="unique_tier_name_per_restaurant"),
            models.UniqueConstraint(fields=["restaurant", "rank"], name="unique_tier_rank_per_restaurant"),
        ]

    def __str__(self):
        return f"{self.name} (Rank {self.rank})"


class AccountStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    SUSPENDED = "SUSPENDED", "Suspended"
    CLOSED = "CLOSED", "Closed"


class LoyaltyAccount(UUIDModel, TimeStampedModel):
    """
    Customer's loyalty points balance, tier status, and lifetime statistics.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="loyalty_accounts"
    )
    customer = models.OneToOneField(
        Customer,
        on_delete=models.CASCADE,
        related_name="loyalty_account"
    )
    current_tier = models.ForeignKey(
        MembershipTier,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="members"
    )
    points_balance = models.IntegerField(default=0)
    lifetime_points_earned = models.PositiveIntegerField(default=0)
    lifetime_points_redeemed = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.ACTIVE
    )

    class Meta:
        verbose_name = "Loyalty Account"
        verbose_name_plural = "Loyalty Accounts"
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "customer"], name="unique_loyalty_account_per_customer"),
        ]

    def __str__(self):
        return f"{self.customer.full_name} - {self.points_balance} pts ({self.status})"


class LoyaltyTransactionType(models.TextChoices):
    EARN = "EARN", "Points Earned"
    REDEEM = "REDEEM", "Points Redeemed"
    ADJUSTMENT = "ADJUSTMENT", "Manual Adjustment"
    EXPIRE = "EXPIRE", "Points Expired"
    REVERSAL = "REVERSAL", "Refund Reversal"
    BONUS = "BONUS", "Bonus Points"


class LoyaltyTransaction(UUIDModel, TimeStampedModel):
    """
    Immutable audit ledger recording every point balance modification.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="loyalty_transactions"
    )
    loyalty_account = models.ForeignKey(
        LoyaltyAccount,
        on_delete=models.CASCADE,
        related_name="transactions"
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=LoyaltyTransactionType.choices,
        db_index=True
    )
    points = models.IntegerField(help_text="Points delta: positive for earn, negative for redeem")
    balance_after = models.IntegerField()
    reference_type = models.CharField(max_length=50, blank=True, default="MANUAL")
    reference_id = models.CharField(max_length=100, blank=True, default="", db_index=True)
    description = models.CharField(max_length=255)
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    class Meta:
        verbose_name = "Loyalty Transaction"
        verbose_name_plural = "Loyalty Transactions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_type} {self.points:+d} pts -> Balance {self.balance_after}"


class RewardType(models.TextChoices):
    FIXED_DISCOUNT = "FIXED_DISCOUNT", "Fixed Amount Off"
    PERCENTAGE_DISCOUNT = "PERCENTAGE_DISCOUNT", "Percentage Off"
    FREE_ITEM = "FREE_ITEM", "Free Item"


class Reward(UUIDModel, TimeStampedModel):
    """
    Catalog of redeemable perks/vouchers redeemable with points.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="loyalty_rewards"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    reward_type = models.CharField(
        max_length=30,
        choices=RewardType.choices,
        default=RewardType.FIXED_DISCOUNT
    )
    points_cost = models.PositiveIntegerField(help_text="Points needed to redeem this reward")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Reward"
        verbose_name_plural = "Rewards"
        ordering = ["points_cost"]

    def __str__(self):
        return f"{self.name} ({self.points_cost} pts)"


class GiftCardStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    SUSPENDED = "SUSPENDED", "Suspended"
    EXPIRED = "EXPIRED", "Expired"
    DEPLETED = "DEPLETED", "Depleted"
    CANCELLED = "CANCELLED", "Cancelled"


class GiftCard(UUIDModel, TimeStampedModel):
    """
    Prepaid digital or physical gift card backed by an immutable transaction ledger.
    """
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="gift_cards"
    )
    card_number = models.CharField(max_length=32, db_index=True)
    secret_code = models.CharField(max_length=64, help_text="Hashed or secured redemption code")
    customer = models.ForeignKey(
        Customer,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="gift_cards"
    )
    initial_balance = models.DecimalField(max_digits=10, decimal_places=2)
    current_balance = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(
        max_length=20,
        choices=GiftCardStatus.choices,
        default=GiftCardStatus.ACTIVE,
        db_index=True
    )
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Gift Card"
        verbose_name_plural = "Gift Cards"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "card_number"], name="unique_card_number_per_restaurant"),
        ]

    @classmethod
    def generate_card_number(cls) -> str:
        part1 = secrets.randbelow(9000) + 1000
        part2 = secrets.randbelow(9000) + 1000
        part3 = secrets.randbelow(9000) + 1000
        return f"GC-{part1}-{part2}-{part3}"

    def __str__(self):
        return f"{self.card_number} (${self.current_balance} {self.currency})"


class GiftCardTransactionType(models.TextChoices):
    ISSUE = "ISSUE", "Initial Issuance"
    LOAD = "LOAD", "Top Up Balance"
    REDEEM = "REDEEM", "Payment Redemption"
    REFUND = "REFUND", "Refund Restoration"
    ADJUSTMENT = "ADJUSTMENT", "Manual Adjustment"
    EXPIRATION = "EXPIRATION", "Expired Balance"
    CANCELLATION = "CANCELLATION", "Card Cancellation"


class GiftCardTransaction(UUIDModel, TimeStampedModel):
    """
    Immutable ledger of all balance-changing events on a gift card.
    """
    gift_card = models.ForeignKey(
        GiftCard,
        on_delete=models.CASCADE,
        related_name="transactions"
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=GiftCardTransactionType.choices,
        db_index=True
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Amount delta")
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference_type = models.CharField(max_length=50, blank=True, default="MANUAL")
    reference_id = models.CharField(max_length=100, blank=True, default="", db_index=True)
    description = models.CharField(max_length=255)
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    class Meta:
        verbose_name = "Gift Card Transaction"
        verbose_name_plural = "Gift Card Transactions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_type} {self.amount:+f} -> Balance ${self.balance_after}"
