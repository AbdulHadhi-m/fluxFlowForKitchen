import pytest
from decimal import Decimal
from apps.restaurants.models import Restaurant
from apps.customers.models import Customer
from apps.loyalty.models import MembershipTier, LoyaltyTransactionType
from apps.loyalty.services import LoyaltyService

@pytest.mark.django_db
def test_points_earning_and_tier_upgrade():
    restaurant = Restaurant.objects.create(
        name="The Grand Steakhouse",
        legal_name="Steakhouse LLC",
        slug="grand-steakhouse",
        email="steak@test.com",
    )
    silver_tier = MembershipTier.objects.create(
        restaurant=restaurant,
        name="Silver",
        rank=2,
        qualification_spend=Decimal("200.00"),
        points_multiplier=Decimal("1.50"),
    )

    customer = Customer.objects.create(
        restaurant=restaurant,
        first_name="Victor",
        phone="+1234567890",
        total_spend=Decimal("250.00"),
    )

    # Earn points on $100 order
    tx = LoyaltyService.earn_points(
        restaurant=restaurant,
        customer=customer,
        spend_amount=Decimal("100.00"),
        order_id="ord-001",
    )

    assert tx is not None
    assert tx.points == 150  # $100 * 1.0 * 1.50 multiplier
    assert tx.balance_after == 150

    account = LoyaltyService.get_or_create_account(restaurant, customer)
    assert account.points_balance == 150
    assert account.current_tier == silver_tier

    # Idempotency check: Same order should not earn points again
    tx_dup = LoyaltyService.earn_points(
        restaurant=restaurant,
        customer=customer,
        spend_amount=Decimal("100.00"),
        order_id="ord-001",
    )
    assert tx_dup is None
    account.refresh_from_db()
    assert account.points_balance == 150


@pytest.mark.django_db
def test_points_redemption_and_adjustment():
    restaurant = Restaurant.objects.create(
        name="Cafe Royal",
        legal_name="Cafe LLC",
        slug="cafe-royal",
        email="cafe@test.com",
    )
    customer = Customer.objects.create(
        restaurant=restaurant,
        first_name="Sophie",
        phone="+1987654321",
    )

    # Initial earn: 200 points
    LoyaltyService.earn_points(
        restaurant=restaurant,
        customer=customer,
        spend_amount=Decimal("200.00"),
        order_id="ord-100",
    )

    # Redeem 100 points
    discount = LoyaltyService.redeem_points(
        restaurant=restaurant,
        customer=customer,
        points=100,
        order_id="ord-101",
    )
    assert discount == Decimal("5.00")  # 100 * 0.05

    account = LoyaltyService.get_or_create_account(restaurant, customer)
    assert account.points_balance == 100
    assert account.lifetime_points_redeemed == 100

    # Manual adjustment (+50 points)
    adj_tx = LoyaltyService.adjust_points(
        restaurant=restaurant,
        customer=customer,
        points_delta=50,
        reason="Goodwill bonus",
    )
    assert adj_tx.balance_after == 150
    account.refresh_from_db()
    assert account.points_balance == 150
