import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.customers.models import Customer
from apps.orders.models import Order
from apps.marketing.models import Promotion, PromotionType, PromotionStatus, Coupon, CouponStatus
from apps.marketing.services import PromotionEligibilityService


@pytest.mark.django_db
class TestTenantIsolation:

    def test_cross_tenant_coupon_rejection(self):
        rest_a = Restaurant.objects.create(name="Restaurant A", slug="rest-a")
        rest_b = Restaurant.objects.create(name="Restaurant B", slug="rest-b")

        user_a = User.objects.create_user(email="staff_a@a.com", password="Password123")
        user_b = User.objects.create_user(email="staff_b@b.com", password="Password123")

        now = timezone.now()

        # Restaurant A creates promotion and coupon
        promo_a = Promotion.objects.create(
            restaurant=rest_a,
            name="Promo A 20%",
            promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
            discount_value=Decimal("20.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
            coupon_required=True
        )
        coupon_a = Coupon.objects.create(
            restaurant=rest_a,
            promotion=promo_a,
            code="RESTA20",
            status=CouponStatus.ACTIVE,
            valid_from=now - timedelta(days=1)
        )

        # Restaurant B order tries to evaluate coupon from Restaurant A
        order_b = Order.objects.create(
            restaurant=rest_b,
            order_number="ORD-B-001",
            created_by=user_b,
            subtotal=Decimal("100.00"),
            total=Decimal("100.00"),
            status=Order.OrderStatus.PLACED
        )

        is_elig, reason, _ = PromotionEligibilityService.evaluate_promotion(
            promotion=promo_a,
            order=order_b,
            coupon_code="RESTA20"
        )
        assert is_elig is False
        assert "different restaurant" in reason.lower()
