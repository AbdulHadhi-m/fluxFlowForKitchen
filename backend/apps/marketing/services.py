import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, time, timedelta
from typing import Optional, List, Dict, Any, Tuple
from django.db import transaction
from django.db.models import Q, F, Sum, Count, Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError, NotFound

from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.customers.models import Customer, CustomerTag
from apps.loyalty.models import LoyaltyAccount, MembershipTier
from apps.menu.models import MenuItem, MenuCategory
from apps.orders.models import Order, OrderItem
from apps.billing.models import Bill
from apps.notifications.services import NotificationService
from apps.notifications.models import NotificationType, NotificationSeverity
from apps.audit.services import AuditLogService
from apps.audit.models import AuditAction, AuditEntityType, AuditActorType

from apps.marketing.models import (
    Promotion,
    PromotionType,
    PromotionStatus,
    AudienceTargetType,
    ItemTargetType,
    Coupon,
    CouponStatus,
    PromotionUsage,
    CustomerSegment,
    CustomerSegmentType,
    MarketingConsent,
    ConsentChannel,
    ConsentStatus,
    Campaign,
    CampaignStatus,
    CampaignChannel,
    CampaignDeliveryLog,
    CampaignDeliveryStatus,
)

logger = logging.getLogger("fluxiflow.marketing")


def quantize_money(amount: Any) -> Decimal:
    """Format and round decimal amount to two decimal places."""
    if amount is None:
        return Decimal("0.00")
    return Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class CustomerSegmentService:
    """
    Evaluates dynamic and static customer segmentation criteria.
    """

    @classmethod
    def get_segment_customers_queryset(cls, segment: CustomerSegment):
        """
        Build an efficient Django QuerySet of eligible customers matching segment criteria.
        """
        qs = Customer.objects.filter(restaurant=segment.restaurant, is_active=True)
        now = timezone.now()

        if segment.segment_type == CustomerSegmentType.ALL_CUSTOMERS:
            return qs

        if segment.segment_type == CustomerSegmentType.NEW_CUSTOMERS:
            thirty_days_ago = now - timedelta(days=30)
            return qs.filter(created_at__gte=thirty_days_ago)

        if segment.segment_type == CustomerSegmentType.REGULAR_CUSTOMERS:
            min_v = max(3, segment.min_visits)
            return qs.filter(total_visits__gte=min_v)

        if segment.segment_type == CustomerSegmentType.VIP_CUSTOMERS:
            # VIP: Has VIP tag OR matches high spend threshold
            vip_tag_q = Q(tags__name__icontains="VIP")
            spend_q = Q(total_spend__gte=segment.min_spend) if segment.min_spend > 0 else Q(total_spend__gte=Decimal("5000.00"))
            return qs.filter(vip_tag_q | spend_q).distinct()

        if segment.segment_type == CustomerSegmentType.INACTIVE_CUSTOMERS:
            days = segment.inactive_days if segment.inactive_days > 0 else 60
            threshold_date = now - timedelta(days=days)
            return qs.filter(Q(last_visit_at__lt=threshold_date) | Q(last_visit_at__isnull=True, created_at__lt=threshold_date))

        if segment.segment_type == CustomerSegmentType.HIGH_VALUE_CUSTOMERS:
            threshold = segment.min_spend if segment.min_spend > 0 else Decimal("10000.00")
            return qs.filter(total_spend__gte=threshold)

        # CUSTOM criteria combination
        if segment.min_spend > Decimal("0.00"):
            qs = qs.filter(total_spend__gte=segment.min_spend)

        if segment.min_visits > 0:
            qs = qs.filter(total_visits__gte=segment.min_visits)

        if segment.inactive_days > 0:
            threshold_date = now - timedelta(days=segment.inactive_days)
            qs = qs.filter(Q(last_visit_at__lt=threshold_date) | Q(last_visit_at__isnull=True, created_at__lt=threshold_date))

        if segment.tags.exists():
            qs = qs.filter(tags__in=segment.tags.all()).distinct()

        if segment.loyalty_tiers.exists():
            tier_ids = segment.loyalty_tiers.values_list("id", flat=True)
            qs = qs.filter(loyalty_account__current_tier_id__in=tier_ids)

        return qs.distinct()

    @classmethod
    def is_customer_in_segment(cls, customer: Customer, segment: CustomerSegment) -> bool:
        """Check if an individual customer matches the segment criteria."""
        if customer.restaurant_id != segment.restaurant_id:
            return False
        return cls.get_segment_customers_queryset(segment).filter(id=customer.id).exists()


class MarketingConsentService:
    """
    Manages customer communication opt-in/opt-out status with audit trail.
    """

    @classmethod
    def get_consent(cls, customer: Customer, channel: str) -> bool:
        """Check if customer has granted marketing consent for a given channel."""
        consent = MarketingConsent.objects.filter(
            restaurant=customer.restaurant,
            customer=customer,
            channel=channel
        ).first()
        if consent:
            return consent.status == ConsentStatus.GRANTED
        # Default policy: In-app is granted by default; external channels require explicit or registration opt-in
        return channel == ConsentChannel.PUSH

    @classmethod
    def set_consent(
        cls,
        restaurant: Restaurant,
        customer: Customer,
        channel: str,
        status: str,
        source: str = "STAFF_OVERRIDE",
        actor_user: Optional[User] = None,
        notes: str = ""
    ) -> MarketingConsent:
        """Update or create marketing consent record with audit logging."""
        with transaction.atomic():
            consent, created = MarketingConsent.objects.get_or_create(
                restaurant=restaurant,
                customer=customer,
                channel=channel,
                defaults={
                    "status": status,
                    "source": source,
                    "granted_at": timezone.now() if status == ConsentStatus.GRANTED else None,
                    "revoked_at": timezone.now() if status == ConsentStatus.REVOKED else None,
                    "notes": notes,
                }
            )

            before_status = consent.status if not created else "NONE"
            if not created:
                consent.status = status
                consent.source = source
                consent.notes = notes
                if status == ConsentStatus.GRANTED:
                    consent.granted_at = timezone.now()
                else:
                    consent.revoked_at = timezone.now()
                consent.save()

            AuditLogService.record(
                restaurant=restaurant,
                action=AuditAction.UPDATE if not created else AuditAction.CREATE,
                entity_type=AuditEntityType.MARKETING_CONSENT,
                entity_id=str(consent.id),
                actor_user=actor_user,
                actor_type=AuditActorType.USER if actor_user else AuditActorType.SYSTEM,
                description=f"Marketing consent for {customer.full_name} on {channel} set to {status}",
                before_data={"status": before_status},
                after_data={"status": status, "channel": channel, "source": source}
            )

            return consent


class PromotionEligibilityService:
    """
    Authoritative rules engine validating promotion & coupon eligibility.
    """

    @classmethod
    def evaluate_promotion(
        cls,
        promotion: Promotion,
        order: Order,
        customer: Optional[Customer] = None,
        coupon_code: Optional[str] = None,
        current_time: Optional[datetime] = None,
    ) -> Tuple[bool, str, Optional[Coupon]]:
        """
        Evaluate if a promotion applies to the given order, customer, and coupon.
        Returns (is_eligible, reason_message, matched_coupon).
        """
        now = current_time or timezone.now()

        # 1. Tenant Verification
        if promotion.restaurant_id != order.restaurant_id:
            return False, "Promotion belongs to a different restaurant organization.", None

        # 2. Status & Schedule
        if promotion.status != PromotionStatus.ACTIVE:
            return False, f"Promotion is currently '{promotion.get_status_display()}'.", None

        if promotion.start_at > now:
            return False, f"Promotion is not active yet (starts at {promotion.start_at.strftime('%Y-%m-%d %H:%M')}).", None

        if promotion.end_at and promotion.end_at < now:
            return False, f"Promotion has expired (ended at {promotion.end_at.strftime('%Y-%m-%d %H:%M')}).", None

        # 3. Total Usage Limit
        if promotion.total_usage_limit is not None and promotion.current_usage_count >= promotion.total_usage_limit:
            return False, "Promotion total redemption limit has been reached.", None

        # 4. Daily Usage Limit
        if promotion.daily_usage_limit is not None:
            today_start = timezone.make_aware(datetime.combine(now.date(), time.min))
            today_count = PromotionUsage.objects.filter(
                promotion=promotion,
                redeemed_at__gte=today_start,
                is_reversed=False
            ).count()
            if today_count >= promotion.daily_usage_limit:
                return False, "Promotion daily usage limit reached for today.", None

        # 5. Customer Qualification
        if customer:
            # Per-customer limit
            if promotion.per_customer_limit > 0:
                customer_usages = PromotionUsage.objects.filter(
                    promotion=promotion,
                    customer=customer,
                    is_reversed=False
                ).count()
                if customer_usages >= promotion.per_customer_limit:
                    return False, f"Customer has already redeemed this promotion maximum times ({promotion.per_customer_limit}).", None

            # Audience targeting rules
            target_type = promotion.target_audience_type
            if target_type == AudienceTargetType.FIRST_ORDER:
                # Must have 0 visits and no previous promotion usages
                has_history = (customer.total_visits > 0) or PromotionUsage.objects.filter(
                    restaurant=promotion.restaurant,
                    customer=customer,
                    is_reversed=False
                ).exists()
                if has_history:
                    return False, "Promotion is reserved exclusively for first-time customers.", None

            elif target_type == AudienceTargetType.RETURNING:
                # Must have at least 1 visit or completed order
                if customer.total_visits < 1:
                    return False, "Promotion requires at least one previous dining visit.", None

            elif target_type == AudienceTargetType.INACTIVE_CUSTOMERS:
                days = promotion.target_inactive_days or 60
                threshold_date = now - timedelta(days=days)
                if customer.last_visit_at and customer.last_visit_at >= threshold_date:
                    return False, f"Promotion is targeted at inactive customers (no visits in past {days} days).", None

            elif target_type == AudienceTargetType.SPECIFIC_CUSTOMERS:
                if not promotion.target_customers.filter(id=customer.id).exists():
                    return False, "Promotion is targeted to specific invited customer accounts.", None

            elif target_type == AudienceTargetType.CUSTOMER_TAGS:
                if not customer.tags.filter(id__in=promotion.target_tags.values_list("id", flat=True)).exists():
                    return False, "Customer does not have the required membership tags.", None

            elif target_type == AudienceTargetType.CUSTOMER_SEGMENT:
                if promotion.target_segment and not CustomerSegmentService.is_customer_in_segment(customer, promotion.target_segment):
                    return False, f"Customer is not part of target segment '{promotion.target_segment.name}'.", None

            elif target_type == AudienceTargetType.LOYALTY_TIER:
                loyalty_account = getattr(customer, "loyalty_account", None)
                if not loyalty_account or not loyalty_account.current_tier or not promotion.target_loyalty_tiers.filter(id=loyalty_account.current_tier_id).exists():
                    return False, "Promotion is reserved for specific loyalty membership tiers.", None

        else:
            # No customer provided — only allow promotions targeting ALL customers
            if promotion.target_audience_type not in [AudienceTargetType.ALL, AudienceTargetType.FIRST_ORDER]:
                return False, "Promotion requires an identified customer account to qualify.", None

        # 6. Minimum Spend Requirement
        subtotal = Decimal(str(order.subtotal or "0.00"))
        if subtotal < promotion.min_order_value:
            return False, f"Order subtotal {subtotal} is below minimum requirement of {promotion.min_order_value}.", None

        # 7. Item Targeting Requirement
        if promotion.target_item_type == ItemTargetType.SPECIFIC_ITEMS:
            target_item_ids = set(promotion.target_menu_items.values_list("id", flat=True))
            order_item_ids = set(order.items.values_list("menu_item_id", flat=True))
            if not target_item_ids.intersection(order_item_ids):
                return False, "Order does not contain qualifying menu items.", None

        elif promotion.target_item_type == ItemTargetType.CATEGORIES:
            target_cat_ids = set(promotion.target_categories.values_list("id", flat=True))
            order_cat_ids = set(order.items.filter(menu_item__category_id__isnull=False).values_list("menu_item__category_id", flat=True))
            if not target_cat_ids.intersection(order_cat_ids):
                return False, "Order does not contain items from qualifying categories.", None

        # 8. Coupon Code Requirement
        matched_coupon = None
        if promotion.coupon_required:
            if not coupon_code:
                return False, "This promotion requires a valid coupon code.", None

            coupon = Coupon.objects.filter(
                restaurant=promotion.restaurant,
                promotion=promotion,
                code__iexact=coupon_code.strip()
            ).first()

            if not coupon:
                return False, f"Invalid coupon code '{coupon_code}' for this promotion.", None

            if coupon.status != CouponStatus.ACTIVE:
                return False, f"Coupon code '{coupon.code}' is currently {coupon.get_status_display().lower()}.", None

            if coupon.valid_from > now:
                return False, f"Coupon is not active yet (valid from {coupon.valid_from.strftime('%Y-%m-%d')}).", None

            if coupon.valid_until and coupon.valid_until < now:
                return False, f"Coupon has expired (valid until {coupon.valid_until.strftime('%Y-%m-%d')}).", None

            if coupon.usage_limit is not None and coupon.current_usage_count >= coupon.usage_limit:
                return False, "Coupon code redemption limit reached.", None

            if customer and coupon.per_customer_limit > 0:
                coupon_cust_usages = PromotionUsage.objects.filter(
                    coupon=coupon,
                    customer=customer,
                    is_reversed=False
                ).count()
                if coupon_cust_usages >= coupon.per_customer_limit:
                    return False, f"Customer has already used coupon '{coupon.code}' maximum times.", None

            matched_coupon = coupon

        return True, "Eligible", matched_coupon


class PromotionCalculationService:
    """
    Computes exact monetary discount deductions according to promotion rules.
    """

    @classmethod
    def calculate_discount_amount(cls, promotion: Promotion, order: Order) -> Decimal:
        """
        Calculate authoritative discount currency deduction for a single promotion on an order.
        """
        subtotal = Decimal(str(order.subtotal or "0.00"))
        if subtotal <= Decimal("0.00"):
            return Decimal("0.00")

        # Determine eligible base amount (either full subtotal or item-specific line total sum)
        applicable_subtotal = subtotal
        if promotion.target_item_type == ItemTargetType.SPECIFIC_ITEMS:
            item_ids = set(promotion.target_menu_items.values_list("id", flat=True))
            line_sum = Decimal("0.00")
            for item in order.items.all():
                if item.menu_item_id in item_ids:
                    line_sum += item.line_total
            applicable_subtotal = line_sum

        elif promotion.target_item_type == ItemTargetType.CATEGORIES:
            cat_ids = set(promotion.target_categories.values_list("id", flat=True))
            line_sum = Decimal("0.00")
            for item in order.items.all():
                if item.menu_item and item.menu_item.category_id in cat_ids:
                    line_sum += item.line_total
            applicable_subtotal = line_sum

        if applicable_subtotal <= Decimal("0.00"):
            return Decimal("0.00")

        discount = Decimal("0.00")
        if promotion.promotion_type == PromotionType.PERCENTAGE_DISCOUNT:
            pct = promotion.discount_value
            raw_discount = (applicable_subtotal * pct) / Decimal("100.00")
            if promotion.max_discount_amount is not None and promotion.max_discount_amount > Decimal("0.00"):
                raw_discount = min(raw_discount, promotion.max_discount_amount)
            discount = quantize_money(raw_discount)

        elif promotion.promotion_type == PromotionType.FIXED_DISCOUNT:
            discount = quantize_money(min(promotion.discount_value, applicable_subtotal))

        elif promotion.promotion_type in [PromotionType.FREE_ITEM, PromotionType.BUY_X_GET_Y]:
            # For free item / buy X get Y, discount is minimum of promo fixed value or applicable item total
            discount = quantize_money(min(promotion.discount_value if promotion.discount_value > 0 else applicable_subtotal, applicable_subtotal))

        return min(discount, subtotal)

    @classmethod
    def evaluate_and_calculate_all(
        cls,
        restaurant: Restaurant,
        order: Order,
        customer: Optional[Customer] = None,
        coupon_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates all available active promotions and coupons for an order,
        resolves stacking and priority, and returns recommended and eligible discounts.
        """
        now = timezone.now()
        active_promos = Promotion.objects.filter(
            restaurant=restaurant,
            status=PromotionStatus.ACTIVE,
            start_at__lte=now
        ).filter(
            Q(end_at__isnull=True) | Q(end_at__gte=now)
        ).prefetch_related(
            "target_menu_items", "target_categories", "target_tags", "target_loyalty_tiers", "target_customers"
        ).order_by("-priority", "-created_at")

        eligible_list: List[Dict[str, Any]] = []

        for promo in active_promos:
            # If promo requires coupon and coupon_code provided does not match, skip
            if promo.coupon_required and not coupon_code:
                continue

            is_elig, reason, coupon = PromotionEligibilityService.evaluate_promotion(
                promotion=promo,
                order=order,
                customer=customer,
                coupon_code=coupon_code,
                current_time=now
            )

            if is_elig:
                discount_amt = cls.calculate_discount_amount(promo, order)
                if discount_amt > Decimal("0.00"):
                    eligible_list.append({
                        "promotion_id": str(promo.id),
                        "promotion_name": promo.name,
                        "promotion_type": promo.promotion_type,
                        "discount_value": str(promo.discount_value),
                        "discount_amount": str(discount_amt),
                        "priority": promo.priority,
                        "stackable": promo.stackable,
                        "coupon_required": promo.coupon_required,
                        "coupon_code": coupon.code if coupon else None,
                        "coupon_id": str(coupon.id) if coupon else None,
                        "reason": reason,
                        "_discount_dec": discount_amt,
                        "_promo_obj": promo,
                    })

        # Selection strategy:
        # 1. If coupon code explicitly matched, prioritize the coupon promotion
        # 2. Otherwise, pick best non-coupon automatic promotion or highest priority
        recommended_promotion = None
        total_discount = Decimal("0.00")
        applied_promotions: List[Dict[str, Any]] = []

        if eligible_list:
            # Sort eligible by priority desc, then discount amount desc
            eligible_list.sort(key=lambda x: (x["priority"], x["_discount_dec"]), reverse=True)
            top_promo = eligible_list[0]
            recommended_promotion = top_promo
            applied_promotions.append(top_promo)
            total_discount = top_promo["_discount_dec"]

            # If top promotion is stackable, look for other stackable promotions
            if top_promo["stackable"]:
                for other in eligible_list[1:]:
                    if other["stackable"]:
                        subtotal = Decimal(str(order.subtotal or "0.00"))
                        if total_discount + other["_discount_dec"] <= subtotal:
                            total_discount += other["_discount_dec"]
                            applied_promotions.append(other)

        # Clean private keys for response
        clean_eligible = [
            {k: v for k, v in item.items() if not k.startswith("_")}
            for item in eligible_list
        ]
        clean_applied = [
            {k: v for k, v in item.items() if not k.startswith("_")}
            for item in applied_promotions
        ]

        subtotal_dec = Decimal(str(order.subtotal or "0.00"))
        net_total = max(Decimal("0.00"), subtotal_dec - total_discount)

        return {
            "order_id": str(order.id),
            "order_number": order.order_number,
            "subtotal": str(subtotal_dec),
            "total_discount": str(total_discount),
            "net_total": str(net_total),
            "applied_promotions": clean_applied,
            "eligible_promotions": clean_eligible,
            "recommended_promotion": {k: v for k, v in recommended_promotion.items() if not k.startswith("_")} if recommended_promotion else None,
            "has_discount": total_discount > Decimal("0.00"),
        }


class PromotionRedemptionService:
    """
    Atomic promotion redemption and reversal service with concurrency protection.
    """

    @classmethod
    def record_promotion_redemption(
        cls,
        restaurant: Restaurant,
        promotion: Promotion,
        discount_amount: Decimal,
        order: Optional[Order] = None,
        bill: Optional[Bill] = None,
        customer: Optional[Customer] = None,
        coupon: Optional[Coupon] = None,
        actor_user: Optional[User] = None,
    ) -> PromotionUsage:
        """
        Record authoritative promotion redemption atomically under row-level DB lock.
        Prevents usage limit race conditions across simultaneous POS checkouts.
        """
        with transaction.atomic():
            # Lock promotion and coupon for update
            locked_promo = Promotion.objects.select_for_update().get(id=promotion.id)
            locked_coupon = None
            if coupon:
                locked_coupon = Coupon.objects.select_for_update().get(id=coupon.id)

            # Check limits under lock
            if locked_promo.total_usage_limit is not None and locked_promo.current_usage_count >= locked_promo.total_usage_limit:
                raise ValidationError({"promotion": ["Promotion usage limit reached under concurrent evaluation."]})

            if locked_coupon and locked_coupon.usage_limit is not None and locked_coupon.current_usage_count >= locked_coupon.usage_limit:
                raise ValidationError({"coupon": ["Coupon code usage limit reached under concurrent evaluation."]})

            # Create immutable usage record
            usage = PromotionUsage.objects.create(
                restaurant=restaurant,
                promotion=locked_promo,
                coupon=locked_coupon,
                customer=customer,
                order=order,
                bill=bill,
                discount_amount=quantize_money(discount_amount),
                actor_user=actor_user,
            )

            # Increment usage counters
            locked_promo.current_usage_count += 1
            locked_promo.save(update_fields=["current_usage_count"])

            if locked_coupon:
                locked_coupon.current_usage_count += 1
                locked_coupon.save(update_fields=["current_usage_count"])

            AuditLogService.record(
                restaurant=restaurant,
                action=AuditAction.CREATE,
                entity_type=AuditEntityType.PROMOTION,
                entity_id=str(locked_promo.id),
                actor_user=actor_user,
                actor_type=AuditActorType.USER if actor_user else AuditActorType.SYSTEM,
                description=f"Redeemed promotion '{locked_promo.name}' (-{discount_amount}) for order {order.order_number if order else 'N/A'}",
                after_data={
                    "usage_id": str(usage.id),
                    "discount_amount": str(discount_amount),
                    "coupon_code": locked_coupon.code if locked_coupon else None,
                    "customer_id": str(customer.id) if customer else None,
                }
            )

            return usage

    @classmethod
    def reverse_promotion_usage(
        cls,
        order: Order,
        reason: str = "Order Cancelled / Voided",
        actor_user: Optional[User] = None
    ) -> List[PromotionUsage]:
        """
        Reverse promotion usage when an order or bill is cancelled or refunded.
        Decrements usage counters atomically and records audit log without deleting history.
        """
        with transaction.atomic():
            usages = PromotionUsage.objects.select_for_update().filter(order=order, is_reversed=False)
            reversed_list = []

            for usage in usages:
                usage.is_reversed = True
                usage.reversed_at = timezone.now()
                usage.reversal_reason = reason
                usage.save(update_fields=["is_reversed", "reversed_at", "reversal_reason"])

                # Decrement promotion counter
                locked_promo = Promotion.objects.select_for_update().get(id=usage.promotion_id)
                if locked_promo.current_usage_count > 0:
                    locked_promo.current_usage_count -= 1
                    locked_promo.save(update_fields=["current_usage_count"])

                # Decrement coupon counter if applicable
                if usage.coupon_id:
                    locked_coupon = Coupon.objects.select_for_update().get(id=usage.coupon_id)
                    if locked_coupon.current_usage_count > 0:
                        locked_coupon.current_usage_count -= 1
                        locked_coupon.save(update_fields=["current_usage_count"])

                AuditLogService.record(
                    restaurant=order.restaurant,
                    action=AuditAction.UPDATE,
                    entity_type=AuditEntityType.PROMOTION,
                    entity_id=str(usage.promotion_id),
                    actor_user=actor_user,
                    actor_type=AuditActorType.USER if actor_user else AuditActorType.SYSTEM,
                    description=f"Reversed promotion redemption for order {order.order_number}: {reason}",
                    after_data={"usage_id": str(usage.id), "reason": reason}
                )
                reversed_list.append(usage)

            return reversed_list


class CampaignService:
    """
    Orchestrates marketing campaigns, audience targeting, consent enforcement,
    and idempotent notification delivery.
    """

    @classmethod
    def launch_campaign(cls, campaign: Campaign, actor_user: Optional[User] = None) -> Dict[str, Any]:
        """
        Execute an active marketing campaign, sending notifications to targeted audience.
        Respects customer marketing consent and guarantees delivery idempotency.
        """
        with transaction.atomic():
            locked_campaign = Campaign.objects.select_for_update().get(id=campaign.id)

            if locked_campaign.status in [CampaignStatus.COMPLETED, CampaignStatus.CANCELLED]:
                raise ValidationError({"campaign": [f"Cannot launch campaign in '{locked_campaign.status}' status."]})

            locked_campaign.status = CampaignStatus.RUNNING
            locked_campaign.save(update_fields=["status"])

        # Resolve audience
        if locked_campaign.target_segment:
            audience_qs = CustomerSegmentService.get_segment_customers_queryset(locked_campaign.target_segment)
        else:
            audience_qs = Customer.objects.filter(restaurant=locked_campaign.restaurant, is_active=True)

        customers = list(audience_qs)
        sent_count = 0
        skipped_count = 0
        failed_count = 0

        for customer in customers:
            # 1. Consent Check
            channel_mapping = {
                CampaignChannel.IN_APP: ConsentChannel.PUSH,
                CampaignChannel.EMAIL: ConsentChannel.EMAIL,
                CampaignChannel.SMS: ConsentChannel.SMS,
            }
            required_consent_channel = channel_mapping.get(locked_campaign.channel, ConsentChannel.PUSH)
            has_consent = MarketingConsentService.get_consent(customer, required_consent_channel)

            if not has_consent:
                skipped_count += 1
                continue

            # 2. Idempotency Key
            idempotency_key = f"{locked_campaign.id}:{customer.id}:{locked_campaign.channel}"
            if CampaignDeliveryLog.objects.filter(idempotency_key=idempotency_key).exists():
                skipped_count += 1
                continue

            # 3. Delivery
            try:
                # Personalize template
                body = locked_campaign.message_template.replace("{customer_name}", customer.full_name)
                if locked_campaign.promotion:
                    body = body.replace("{promo_name}", locked_campaign.promotion.name)

                # Send in-app notification if channel is IN_APP (and system alert)
                if locked_campaign.channel == CampaignChannel.IN_APP:
                    # Find user account linked to restaurant
                    staff_admin = User.objects.filter(memberships__tenant_id=locked_campaign.restaurant.id).first() or User.objects.first()
                    if staff_admin:
                        NotificationService.create_notification(
                            restaurant=locked_campaign.restaurant,
                            recipient=staff_admin,
                            title=f"📢 {locked_campaign.title}",
                            message=f"Campaign alert for {customer.full_name}: {body}",
                            notification_type=NotificationType.SYSTEM_ALERT,
                            severity=NotificationSeverity.INFO,
                            action_url="/marketing",
                            entity_type="campaign",
                            entity_id=str(locked_campaign.id),
                            deduplication_key=idempotency_key
                        )

                CampaignDeliveryLog.objects.create(
                    campaign=locked_campaign,
                    customer=customer,
                    channel=locked_campaign.channel,
                    status=CampaignDeliveryStatus.DELIVERED,
                    idempotency_key=idempotency_key
                )
                sent_count += 1

            except Exception as exc:
                logger.error("Campaign delivery failed for %s: %s", customer.id, str(exc))
                CampaignDeliveryLog.objects.create(
                    campaign=locked_campaign,
                    customer=customer,
                    channel=locked_campaign.channel,
                    status=CampaignDeliveryStatus.FAILED,
                    failure_reason=str(exc),
                    idempotency_key=idempotency_key
                )
                failed_count += 1

        # Update campaign counters
        with transaction.atomic():
            locked_campaign = Campaign.objects.select_for_update().get(id=locked_campaign.id)
            locked_campaign.sent_count += sent_count
            locked_campaign.delivered_count += sent_count
            locked_campaign.skipped_count += skipped_count
            locked_campaign.failed_count += failed_count
            locked_campaign.status = CampaignStatus.COMPLETED
            locked_campaign.save()

            AuditLogService.record(
                restaurant=locked_campaign.restaurant,
                action=AuditAction.UPDATE,
                entity_type=AuditEntityType.CAMPAIGN,
                entity_id=str(locked_campaign.id),
                actor_user=actor_user,
                actor_type=AuditActorType.USER if actor_user else AuditActorType.SYSTEM,
                description=f"Completed campaign '{locked_campaign.name}' with {sent_count} sent, {skipped_count} skipped.",
                after_data={
                    "sent_count": sent_count,
                    "skipped_count": skipped_count,
                    "failed_count": failed_count,
                }
            )

            def emit_campaign_completed():
                from apps.workflows.events import publish_event_via_bus
                publish_event_via_bus(
                    restaurant=locked_campaign.restaurant,
                    event_type="CAMPAIGN_COMPLETED",
                    entity_type="CAMPAIGN",
                    entity_id=str(locked_campaign.id),
                    payload={
                        "campaign_id": str(locked_campaign.id),
                        "name": locked_campaign.name,
                        "channel": locked_campaign.channel,
                        "sent_count": sent_count,
                        "skipped_count": skipped_count,
                        "failed_count": failed_count,
                        "total_audience": len(customers),
                    },
                )
            transaction.on_commit(emit_campaign_completed)

        return {
            "campaign_id": str(locked_campaign.id),
            "status": locked_campaign.status,
            "sent_count": sent_count,
            "skipped_count": skipped_count,
            "failed_count": failed_count,
            "total_audience": len(customers),
        }


class MarketingAnalyticsService:
    """
    Computes marketing and promotion performance metrics, redemptions, and ROI estimates.
    """

    @classmethod
    def get_marketing_overview(
        cls,
        restaurant: Restaurant,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Aggregate top-level marketing metrics: active promos, coupons redeemed,
        total discounts awarded, revenue influenced, and top promotions.
        """
        usages_qs = PromotionUsage.objects.filter(restaurant=restaurant, is_reversed=False)
        if start_date:
            usages_qs = usages_qs.filter(redeemed_at__gte=start_date)
        if end_date:
            usages_qs = usages_qs.filter(redeemed_at__lte=end_date)

        total_redemptions = usages_qs.count()
        total_discount_given = quantize_money(usages_qs.aggregate(total=Sum("discount_amount"))["total"] or Decimal("0.00"))

        # Calculate orders influenced revenue
        order_ids = usages_qs.values_list("order_id", flat=True).distinct()
        promotional_revenue = quantize_money(
            Order.objects.filter(id__in=order_ids, status=Order.OrderStatus.COMPLETED).aggregate(total=Sum("total"))["total"] or Decimal("0.00")
        )

        active_promotions_count = Promotion.objects.filter(restaurant=restaurant, status=PromotionStatus.ACTIVE).count()
        active_coupons_count = Coupon.objects.filter(restaurant=restaurant, status=CouponStatus.ACTIVE).count()
        total_campaigns_count = Campaign.objects.filter(restaurant=restaurant).count()
        total_segments_count = CustomerSegment.objects.filter(restaurant=restaurant, is_active=True).count()

        # Top 5 performing promotions by redemptions
        top_promos = (
            usages_qs.values("promotion__id", "promotion__name", "promotion__promotion_type")
            .annotate(
                redemptions=Count("id"),
                total_discount=Sum("discount_amount")
            )
            .order_by("-redemptions")[:5]
        )

        top_promos_list = [
            {
                "id": str(p["promotion__id"]),
                "name": p["promotion__name"],
                "type": p["promotion__promotion_type"],
                "redemptions": p["redemptions"],
                "total_discount": str(quantize_money(p["total_discount"])),
            }
            for p in top_promos
        ]

        # Top coupons
        top_coupons = (
            usages_qs.filter(coupon__isnull=False)
            .values("coupon__id", "coupon__code", "promotion__name")
            .annotate(
                redemptions=Count("id"),
                total_discount=Sum("discount_amount")
            )
            .order_by("-redemptions")[:5]
        )

        top_coupons_list = [
            {
                "id": str(c["coupon__id"]),
                "code": c["coupon__code"],
                "promotion_name": c["promotion__name"],
                "redemptions": c["redemptions"],
                "total_discount": str(quantize_money(c["total_discount"])),
            }
            for c in top_coupons
        ]

        return {
            "active_promotions_count": active_promotions_count,
            "active_coupons_count": active_coupons_count,
            "total_campaigns_count": total_campaigns_count,
            "total_segments_count": total_segments_count,
            "total_redemptions": total_redemptions,
            "total_discount_given": str(total_discount_given),
            "promotional_revenue_influenced": str(promotional_revenue),
            "top_promotions": top_promos_list,
            "top_coupons": top_coupons_list,
        }
