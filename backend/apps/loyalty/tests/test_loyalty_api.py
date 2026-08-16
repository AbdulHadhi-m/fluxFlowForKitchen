import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.customers.models import Customer
from apps.loyalty.services import LoyaltyService

@pytest.mark.django_db
def test_loyalty_and_gift_card_apis():
    RBACService.seed_system_roles_and_permissions()

    user = User.objects.create_user(email="manager_loyalty@test.com", password="password123")
    restaurant, _ = RestaurantService.create_restaurant(user=user, name="Loyalty Diner")

    customer = Customer.objects.create(restaurant=restaurant, first_name="Lucas", phone="+1000222333")
    account = LoyaltyService.get_or_create_account(restaurant, customer)

    client = APIClient()
    client.force_authenticate(user=user)

    # 1. Get Loyalty Program
    prog_resp = client.get("/api/v1/loyalty/program/")
    assert prog_resp.status_code == 200

    # 2. Get Loyalty Accounts
    accounts_resp = client.get("/api/v1/loyalty/accounts/")
    assert accounts_resp.status_code == 200
    assert len(accounts_resp.data["data"]) == 1

    # 3. Adjust points
    adjust_resp = client.post(f"/api/v1/loyalty/accounts/{account.id}/adjust/", {
        "points_delta": 100,
        "reason": "Welcome promotion",
    }, format="json")
    assert adjust_resp.status_code == 200
    assert adjust_resp.data["data"]["points"] == 100

    # 4. Issue Gift Card
    gc_resp = client.post("/api/v1/gift-cards/", {
        "initial_balance": "75.00",
        "currency": "USD",
    }, format="json")
    assert gc_resp.status_code == 201
    card_number = gc_resp.data["data"]["card_number"]

    # 5. Redeem Gift Card
    redeem_resp = client.post("/api/v1/gift-cards/redeem/", {
        "card_number": card_number,
        "amount": "25.00",
    }, format="json")
    assert redeem_resp.status_code == 200
    assert redeem_resp.data["balance_after"] == "50.00"
