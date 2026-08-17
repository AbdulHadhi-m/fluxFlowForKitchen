import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.customers.models import Customer
from apps.orders.models import Order, OrderItem
from apps.marketing.models import Promotion, PromotionType, PromotionStatus, Coupon, CouponStatus, PromotionUsage
from apps.marketing.services import (
    PromotionEligibilityService,
    PromotionCalculationService,
    PromotionRedemptionService,
)


@pytest.mark.django_db
class TestCouponRulesAndRedemption:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.restaurant = Restaurant.objects.create(name="Coupon Cafe", slug="coupon-cafe")
        self.user = User.objects.create_user(email="cashier@cafe.com", password="Password123")
        self.customer = Customer.objects.create(
            restaurant=self.restaurant,
            first_name="Alice",
            phone="1112223333"
        )
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            order_number="ORD-CPN-001",
            created_by=self.user,
            subtotal=Decimal("50.00"),
            total=Decimal("50.00"),
            status=Order.OrderStatus.PLACED
        )
        self.now = timezone.now()
        self.promotion = Promotion.objects.create(
            restaurant=self.restaurant,
            name="Weekend Promo",
            promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
            discount_value=Decimal("15.00"),
            status=PromotionStatus.ACTIVE,
            start_at=self.now - timedelta(days=1),
            coupon_required=True,
            total_usage_limit=10,
            per_customer_limit=2
        )
        self.coupon = Coupon.objects.create(
            restaurant=self.restaurant,
            promotion=self.promotion,
            code="WEEKEND15",
            status=CouponStatus.ACTIVE,
            usage_limit=5,
            per_customer_limit=2,
            valid_from=self.now - timedelta(days=1),
            valid_until=self.now + timedelta(days=7)
        )

    def test_coupon_validation_success(self):
        is_elig, reason, matched = PromotionEligibilityService.evaluate_promotion(
            promotion=self.promotion,
            order=self.order,
            customer=self.customer,
            coupon_code="weekend15"
        )
        assert is_elig is True
        assert matched.id == self.coupon.id

    def test_coupon_expired_failure(self):
        self.coupon.valid_until = self.now - timedelta(hours=1)
        self.coupon.save()

        is_elig, reason, _ = PromotionEligibilityService.evaluate_promotion(
            promotion=self.promotion,
            order=self.order,
            customer=self.customer,
            coupon_code="WEEKEND15"
        )
        assert is_elig is False
        assert "expired" in reason.lower()

    def test_atomic_redemption_and_counter_increment(self):
        usage = PromotionRedemptionService.record_promotion_redemption(
            restaurant=self.restaurant,
            promotion=self.promotion,
            discount_amount=Decimal("7.50"),
            order=self.order,
            customer=self.customer,
            coupon=self.coupon,
            actor_user=self.user
        )

        assert usage.discount_amount == Decimal("7.50")
        assert usage.is_reversed is False

        self.promotion.refresh_from_db()
        self.coupon.refresh_from_db()
        assert self.promotion.current_usage_count == 1
        assert self.coupon.current_usage_count == 1

    def test_per_customer_limit_enforcement(self):
        # Redeem twice (allowed limit is 2)
        for _ in range(2):
            PromotionRedemptionService.record_promotion_redemption(
                restaurant=self.restaurant,
                promotion=self.promotion,
                discount_amount=Decimal("5.00"),
                order=self.order,
                customer=self.customer,
                coupon=self.coupon,
                actor_user=self.user
            )

        # 3rd redemption should fail eligibility
        is_elig, reason, _ = PromotionEligibilityService.evaluate_promotion(
            promotion=self.promotion,
            order=self.order,
            customer=self.customer,
            coupon_code="WEEKEND15"
        )
        assert is_elig is False
        assert "maximum times" in reason.lower()

    def test_order_cancellation_reversal(self):
        usage = PromotionRedemptionService.record_promotion_redemption(
            restaurant=self.restaurant,
            promotion=self.promotion,
            discount_amount=Decimal("7.50"),
            order=self.order,
            customer=self.customer,
            coupon=self.coupon,
            actor_user=self.user
        )
        self.promotion.refresh_from_db()
        assert self.promotion.current_usage_count == 1

        reversed_usages = PromotionRedemptionService.reverse_promotion_usage(
            order=self.order,
            reason="Customer cancelled order",
            actor_user=self.user
        )
        assert len(reversed_usages) == 1
        assert reversed_usages[0].is_reversed is True

        self.promotion.refresh_from_db()
        self.coupon.refresh_from_db()
        assert self.promotion.current_usage_count == 0
        assert self.coupon.current_usage_count == 0
