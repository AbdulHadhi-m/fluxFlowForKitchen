import pytest
from decimal import Decimal
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.loyalty.models import GiftCardStatus
from apps.loyalty.services import GiftCardService

@pytest.mark.django_db
def test_gift_card_issue_and_redemption():
    restaurant = Restaurant.objects.create(
        name="Ocean Breeze",
        legal_name="Breeze LLC",
        slug="ocean-breeze",
        email="breeze@test.com",
    )

    card = GiftCardService.issue_gift_card(
        restaurant=restaurant,
        initial_balance=Decimal("150.00"),
    )

    assert card.current_balance == Decimal("150.00")
    assert card.status == GiftCardStatus.ACTIVE

    # Partial redemption of $50
    tx = GiftCardService.redeem_gift_card(
        restaurant=restaurant,
        card_number=card.card_number,
        amount=Decimal("50.00"),
        reference_id="bill-001",
    )

    assert tx.balance_after == Decimal("100.00")
    card.refresh_from_db()
    assert card.current_balance == Decimal("100.00")

    # Over-redemption fails
    with pytest.raises(ValidationError):
        GiftCardService.redeem_gift_card(
            restaurant=restaurant,
            card_number=card.card_number,
            amount=Decimal("150.00"),
        )
