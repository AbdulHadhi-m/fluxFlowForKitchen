from rest_framework import serializers
from apps.loyalty.models import (
    LoyaltyProgram,
    MembershipTier,
    LoyaltyAccount,
    LoyaltyTransaction,
    Reward,
    GiftCard,
    GiftCardTransaction,
)

class LoyaltyProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyProgram
        fields = [
            "id",
            "name",
            "description",
            "status",
            "points_enabled",
            "earning_rate",
            "redemption_enabled",
            "redemption_rate",
            "min_points_redemption",
            "points_expiration_enabled",
            "points_expiration_days",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MembershipTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipTier
        fields = [
            "id",
            "name",
            "rank",
            "qualification_spend",
            "points_multiplier",
            "discount_percentage",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyTransaction
        fields = [
            "id",
            "transaction_type",
            "points",
            "balance_after",
            "reference_type",
            "reference_id",
            "description",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class LoyaltyAccountSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    tier_name = serializers.CharField(source="current_tier.name", read_only=True, default="Standard")

    class Meta:
        model = LoyaltyAccount
        fields = [
            "id",
            "customer",
            "customer_name",
            "customer_phone",
            "current_tier",
            "tier_name",
            "points_balance",
            "lifetime_points_earned",
            "lifetime_points_redeemed",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "points_balance",
            "lifetime_points_earned",
            "lifetime_points_redeemed",
            "created_at",
            "updated_at",
        ]


class RewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = [
            "id",
            "name",
            "description",
            "reward_type",
            "points_cost",
            "discount_amount",
            "discount_percentage",
            "min_order_value",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class GiftCardTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GiftCardTransaction
        fields = [
            "id",
            "transaction_type",
            "amount",
            "balance_after",
            "reference_type",
            "reference_id",
            "description",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class GiftCardSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True, default="")

    class Meta:
        model = GiftCard
        fields = [
            "id",
            "card_number",
            "customer",
            "customer_name",
            "initial_balance",
            "current_balance",
            "currency",
            "status",
            "expires_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "card_number", "current_balance", "created_at", "updated_at"]
