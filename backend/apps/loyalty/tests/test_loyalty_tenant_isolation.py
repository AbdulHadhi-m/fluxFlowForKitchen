import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.customers.models import Customer
from apps.loyalty.services import LoyaltyService, GiftCardService
from decimal import Decimal

@pytest.mark.django_db
def test_loyalty_tenant_isolation():
    RBACService.seed_system_roles_and_permissions()

    user_a = User.objects.create_user(email="loyal_a@test.com", password="password123")
    restaurant_a, _ = RestaurantService.create_restaurant(user=user_a, name="Loyal Restaurant A")

    user_b = User.objects.create_user(email="loyal_b@test.com", password="password123")
    restaurant_b, _ = RestaurantService.create_restaurant(user=user_b, name="Loyal Restaurant B")

    customer_b = Customer.objects.create(restaurant=restaurant_b, first_name="Secret", phone="+999888111")
    LoyaltyService.get_or_create_account(restaurant_b, customer_b)
    GiftCardService.issue_gift_card(restaurant=restaurant_b, initial_balance=Decimal("200.00"))

    client = APIClient()
    client.force_authenticate(user=user_a)

    # User A should NOT see Restaurant B's loyalty accounts or gift cards
    resp_accounts = client.get("/api/v1/loyalty/accounts/")
    assert resp_accounts.status_code == 200
    assert len(resp_accounts.data["data"]) == 0

    resp_cards = client.get("/api/v1/gift-cards/")
    assert resp_cards.status_code == 200
    assert len(resp_cards.data["data"]) == 0
