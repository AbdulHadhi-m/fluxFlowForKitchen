import pytest
from decimal import Decimal
from apps.restaurants.models import Restaurant
from apps.customers.models import Customer
from apps.loyalty.models import (
    LoyaltyProgram,
    MembershipTier,
    LoyaltyAccount,
    Reward,
    GiftCard,
)

@pytest.mark.django_db
def test_loyalty_program_and_tier_models():
    restaurant = Restaurant.objects.create(
        name="Sapphire Lounge",
        legal_name="Sapphire LLC",
        slug="sapphire-lounge",
        email="sapphire@test.com",
    )
    program = LoyaltyProgram.objects.create(
        restaurant=restaurant,
        name="Sapphire VIP Club",
        earning_rate=Decimal("1.00"),
    )
    tier = MembershipTier.objects.create(
        restaurant=restaurant,
        name="Gold VIP",
        rank=2,
        qualification_spend=Decimal("1000.00"),
        points_multiplier=Decimal("1.50"),
    )

    assert program.name == "Sapphire VIP Club"
    assert tier.rank == 2
    assert str(tier) == "Gold VIP (Rank 2)"


@pytest.mark.django_db
def test_gift_card_model_creation():
    restaurant = Restaurant.objects.create(
        name="Bella Roma",
        legal_name="Roma LLC",
        slug="bella-roma",
        email="roma@test.com",
    )
    card = GiftCard.objects.create(
        restaurant=restaurant,
        card_number=GiftCard.generate_card_number(),
        secret_code="secret-123",
        initial_balance=Decimal("100.00"),
        current_balance=Decimal("100.00"),
    )

    assert card.card_number.startswith("GC-")
    assert card.current_balance == Decimal("100.00")
