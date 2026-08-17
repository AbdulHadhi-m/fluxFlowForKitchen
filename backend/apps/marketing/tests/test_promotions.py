import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.customers.models import Customer, CustomerTag
from apps.loyalty.models import MembershipTier, LoyaltyAccount
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.models import Order, OrderItem
from apps.marketing.models import (
    Promotion,
    PromotionType,
    PromotionStatus,
    AudienceTargetType,
    ItemTargetType,
    CustomerSegment,
    CustomerSegmentType,
    Coupon,
    CouponStatus,
)
from apps.marketing.services import (
    PromotionEligibilityService,
    PromotionCalculationService,
    PromotionRedemptionService,
)


@pytest.mark.django_db
class TestPromotionEligibilityAndCalculation:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.restaurant = Restaurant.objects.create(name="Marketing Diner", slug="marketing-diner")
        self.other_restaurant = Restaurant.objects.create(name="Other Diner", slug="other-diner")
        self.user = User.objects.create_user(email="staff@diner.com", password="Password123")
        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Burgers")
        self.item1 = MenuItem.objects.create(restaurant=self.restaurant, category=self.category, name="Cheese Burger", price=Decimal("15.00"))
        self.item2 = MenuItem.objects.create(restaurant=self.restaurant, category=self.category, name="Fries", price=Decimal("5.00"))

        self.customer = Customer.objects.create(
            restaurant=self.restaurant,
            first_name="Jane",
            last_name="Doe",
            phone="1234567890",
            total_visits=2,
            total_spend=Decimal("150.00")
        )

        self.order = Order.objects.create(
            restaurant=self.restaurant,
            order_number="ORD-TEST-001",
            created_by=self.user,
            subtotal=Decimal("35.00"),
            total=Decimal("35.00"),
            status=Order.OrderStatus.PLACED
        )
        self.order_item1 = OrderItem.objects.create(
            order=self.order,
            menu_item=self.item1,
            item_name_snapshot="Cheese Burger",
            unit_price_snapshot=Decimal("15.00"),
            quantity=2,
            line_total=Decimal("30.00")
        )
        self.order_item2 = OrderItem.objects.create(
            order=self.order,
            menu_item=self.item2,
            item_name_snapshot="Fries",
            unit_price_snapshot=Decimal("5.00"),
            quantity=1,
            line_total=Decimal("5.00")
        )

    def test_percentage_discount_evaluation(self):
        now = timezone.now()
        promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="20% Off Orders",
            promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
            discount_value=Decimal("20.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
            end_at=now + timedelta(days=5),
            min_order_value=Decimal("20.00"),
            max_discount_amount=Decimal("10.00")
        )

        is_elig, reason, _ = PromotionEligibilityService.evaluate_promotion(
            promotion=promo,
            order=self.order,
            customer=self.customer
        )
        assert is_elig is True
        discount = PromotionCalculationService.calculate_discount_amount(promo, self.order)
        # 20% of 35.00 = 7.00 (under 10.00 cap)
        assert discount == Decimal("7.00")

    def test_max_discount_cap(self):
        now = timezone.now()
        promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="50% Flash Sale with 5 Cap",
            promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
            discount_value=Decimal("50.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
            max_discount_amount=Decimal("5.00")
        )

        discount = PromotionCalculationService.calculate_discount_amount(promo, self.order)
        # 50% of 35.00 = 17.50, capped at 5.00
        assert discount == Decimal("5.00")

    def test_fixed_discount(self):
        now = timezone.now()
        promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="10 Off",
            promotion_type=PromotionType.FIXED_DISCOUNT,
            discount_value=Decimal("10.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
        )

        discount = PromotionCalculationService.calculate_discount_amount(promo, self.order)
        assert discount == Decimal("10.00")

    def test_item_specific_targeting(self):
        now = timezone.now()
        promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="10% Off Burgers Only",
            promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
            discount_value=Decimal("10.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
            target_item_type=ItemTargetType.SPECIFIC_ITEMS
        )
        promo.target_menu_items.add(self.item1)

        discount = PromotionCalculationService.calculate_discount_amount(promo, self.order)
        # 10% of 30.00 (burgers only, fries excluded) = 3.00
        assert discount == Decimal("3.00")

    def test_min_order_value_enforcement(self):
        now = timezone.now()
        promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="Min 50 Required",
            promotion_type=PromotionType.FIXED_DISCOUNT,
            discount_value=Decimal("10.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
            min_order_value=Decimal("50.00")
        )

        is_elig, reason, _ = PromotionEligibilityService.evaluate_promotion(
            promotion=promo,
            order=self.order,
            customer=self.customer
        )
        assert is_elig is False
        assert "below minimum requirement" in reason

    def test_first_order_qualification(self):
        now = timezone.now()
        first_order_promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="First Dining Welcome",
            promotion_type=PromotionType.FIXED_DISCOUNT,
            discount_value=Decimal("5.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
            target_audience_type=AudienceTargetType.FIRST_ORDER
        )

        new_cust = Customer.objects.create(
            restaurant=self.restaurant,
            first_name="First",
            phone="9998887777",
            total_visits=0
        )

        is_elig, _, _ = PromotionEligibilityService.evaluate_promotion(
            promotion=first_order_promo,
            order=self.order,
            customer=new_cust
        )
        assert is_elig is True

    def test_loyalty_tier_targeting(self):
        now = timezone.now()
        tier_gold = MembershipTier.objects.create(
            restaurant=self.restaurant,
            name="Gold VIP",
            rank=3,
            qualification_spend=Decimal("1000.00")
        )
        tier_silver = MembershipTier.objects.create(
            restaurant=self.restaurant,
            name="Silver",
            rank=2,
            qualification_spend=Decimal("500.00")
        )

        promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="Gold Exclusive 30%",
            promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
            discount_value=Decimal("30.00"),
            status=PromotionStatus.ACTIVE,
            start_at=now - timedelta(days=1),
            target_audience_type=AudienceTargetType.LOYALTY_TIER
        )
        promo.target_loyalty_tiers.add(tier_gold)

        account = LoyaltyAccount.objects.create(
            restaurant=self.restaurant,
            customer=self.customer,
            current_tier=tier_silver
        )
        is_elig, reason, _ = PromotionEligibilityService.evaluate_promotion(
            promotion=promo,
            order=self.order,
            customer=self.customer
        )
        assert is_elig is False

        # Upgrade to gold
        account.current_tier = tier_gold
        account.save()
        is_elig, _, _ = PromotionEligibilityService.evaluate_promotion(
            promotion=promo,
            order=self.order,
            customer=self.customer
        )
        assert is_elig is True
