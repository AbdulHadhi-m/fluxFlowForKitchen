from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone
from apps.customers.models import Customer, CustomerTag
from apps.loyalty.models import MembershipTier
from apps.menu.models import MenuItem, MenuCategory
from apps.marketing.models import (
    CustomerSegment,
    CustomerSegmentType,
    MarketingConsent,
    ConsentChannel,
    ConsentStatus,
    Promotion,
    PromotionType,
    PromotionStatus,
    AudienceTargetType,
    ItemTargetType,
    Coupon,
    CouponStatus,
    PromotionUsage,
    Campaign,
    CampaignStatus,
    CampaignChannel,
)


class CustomerSegmentSerializer(serializers.ModelSerializer):
    tags_detail = serializers.SerializerMethodField()
    loyalty_tiers_detail = serializers.SerializerMethodField()
    audience_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomerSegment
        fields = [
            "id",
            "name",
            "description",
            "segment_type",
            "min_spend",
            "min_visits",
            "inactive_days",
            "tags",
            "tags_detail",
            "loyalty_tiers",
            "loyalty_tiers_detail",
            "is_active",
            "audience_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "audience_count", "tags_detail", "loyalty_tiers_detail"]

    def get_tags_detail(self, obj):
        return [{"id": str(t.id), "name": t.name, "color": t.color} for t in obj.tags.all()]

    def get_loyalty_tiers_detail(self, obj):
        return [{"id": str(t.id), "name": t.name, "rank": t.rank} for t in obj.loyalty_tiers.all()]

    def get_audience_count(self, obj):
        from apps.marketing.services import CustomerSegmentService
        return CustomerSegmentService.get_segment_customers_queryset(obj).count()


class MarketingConsentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)

    class Meta:
        model = MarketingConsent
        fields = [
            "id",
            "customer",
            "customer_name",
            "customer_phone",
            "channel",
            "status",
            "source",
            "granted_at",
            "revoked_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "granted_at", "revoked_at"]


class CouponSerializer(serializers.ModelSerializer):
    promotion_name = serializers.CharField(source="promotion.name", read_only=True)
    promotion_type = serializers.CharField(source="promotion.promotion_type", read_only=True)
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            "id",
            "promotion",
            "promotion_name",
            "promotion_type",
            "code",
            "status",
            "usage_limit",
            "per_customer_limit",
            "current_usage_count",
            "valid_from",
            "valid_until",
            "is_valid",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "current_usage_count", "created_at", "updated_at", "is_valid"]

    def get_is_valid(self, obj) -> bool:
        return obj.is_currently_valid()

    def validate_code(self, value):
        code = value.strip().upper()
        if len(code) < 3:
            raise serializers.ValidationError("Coupon code must be at least 3 characters long.")
        return code

    def validate(self, attrs):
        valid_from = attrs.get("valid_from")
        valid_until = attrs.get("valid_until")
        if valid_from and valid_until and valid_from > valid_until:
            raise serializers.ValidationError({"valid_until": "Expiration date cannot precede start date."})
        return attrs


class BulkCouponCreateSerializer(serializers.Serializer):
    promotion_id = serializers.UUIDField()
    count = serializers.IntegerField(min_value=1, max_value=1000, default=10)
    prefix = serializers.CharField(max_length=10, default="SAVE")
    usage_limit = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    per_customer_limit = serializers.IntegerField(min_value=1, default=1)
    valid_from = serializers.DateTimeField(required=False)
    valid_until = serializers.DateTimeField(required=False, allow_null=True)


class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=32)
    order_id = serializers.UUIDField()
    customer_id = serializers.UUIDField(required=False, allow_null=True)


class PromotionSerializer(serializers.ModelSerializer):
    coupons_count = serializers.SerializerMethodField()
    target_segment_name = serializers.CharField(source="target_segment.name", read_only=True)
    target_menu_items_detail = serializers.SerializerMethodField()
    target_categories_detail = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = [
            "id",
            "name",
            "description",
            "promotion_type",
            "discount_value",
            "status",
            "start_at",
            "end_at",
            "priority",
            "stackable",
            "coupon_required",
            "min_order_value",
            "max_discount_amount",
            "total_usage_limit",
            "per_customer_limit",
            "daily_usage_limit",
            "current_usage_count",
            "target_audience_type",
            "target_segment",
            "target_segment_name",
            "target_customers",
            "target_tags",
            "target_loyalty_tiers",
            "target_inactive_days",
            "target_item_type",
            "target_menu_items",
            "target_menu_items_detail",
            "target_categories",
            "target_categories_detail",
            "coupons_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "current_usage_count", "created_at", "updated_at", "coupons_count"]

    def get_coupons_count(self, obj) -> int:
        return obj.coupons.count()

    def get_target_menu_items_detail(self, obj):
        return [{"id": str(i.id), "name": i.name, "price": str(i.price)} for i in obj.target_menu_items.all()]

    def get_target_categories_detail(self, obj):
        return [{"id": str(c.id), "name": c.name} for c in obj.target_categories.all()]

    def validate(self, attrs):
        start_at = attrs.get("start_at")
        end_at = attrs.get("end_at")
        if start_at and end_at and start_at > end_at:
            raise serializers.ValidationError({"end_at": "Promotion end date cannot be earlier than start date."})

        p_type = attrs.get("promotion_type")
        val = attrs.get("discount_value", Decimal("0.00"))
        if p_type == PromotionType.PERCENTAGE_DISCOUNT:
            if val < Decimal("0.00") or val > Decimal("100.00"):
                raise serializers.ValidationError({"discount_value": "Percentage discount must be between 0% and 100%."})

        return attrs


class PromotionEvaluateSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    customer_id = serializers.UUIDField(required=False, allow_null=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class PromotionUsageSerializer(serializers.ModelSerializer):
    promotion_name = serializers.CharField(source="promotion.name", read_only=True)
    coupon_code = serializers.CharField(source="coupon.code", read_only=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)

    class Meta:
        model = PromotionUsage
        fields = [
            "id",
            "promotion",
            "promotion_name",
            "coupon",
            "coupon_code",
            "customer",
            "customer_name",
            "order",
            "order_number",
            "bill",
            "discount_amount",
            "redeemed_at",
            "is_reversed",
            "reversed_at",
            "reversal_reason",
        ]
        read_only_fields = ["id", "redeemed_at"]


class CampaignSerializer(serializers.ModelSerializer):
    promotion_name = serializers.CharField(source="promotion.name", read_only=True)
    target_segment_name = serializers.CharField(source="target_segment.name", read_only=True)

    class Meta:
        model = Campaign
        fields = [
            "id",
            "name",
            "description",
            "status",
            "promotion",
            "promotion_name",
            "target_segment",
            "target_segment_name",
            "channel",
            "title",
            "message_template",
            "start_at",
            "end_at",
            "sent_count",
            "delivered_count",
            "failed_count",
            "skipped_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "sent_count", "delivered_count", "failed_count", "skipped_count", "created_at", "updated_at"]

    def validate(self, attrs):
        start_at = attrs.get("start_at")
        end_at = attrs.get("end_at")
        if start_at and end_at and start_at > end_at:
            raise serializers.ValidationError({"end_at": "Campaign end date cannot precede start date."})
        return attrs
