import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.customers.models import Customer

@pytest.mark.django_db
def test_customer_tenant_isolation():
    RBACService.seed_system_roles_and_permissions()

    user_a = User.objects.create_user(email="tenant_a@test.com", password="password123")
    restaurant_a, _ = RestaurantService.create_restaurant(user=user_a, name="Restaurant A")

    user_b = User.objects.create_user(email="tenant_b@test.com", password="password123")
    restaurant_b, _ = RestaurantService.create_restaurant(user=user_b, name="Restaurant B")

    Customer.objects.create(restaurant=restaurant_b, first_name="Secret", last_name="Customer", phone="+999111222")

    client = APIClient()
    client.force_authenticate(user=user_a)

    # User in Restaurant A should NOT see Restaurant B's customer
    resp = client.get("/api/v1/customers/")
    assert resp.status_code == 200
    assert len(resp.data["data"]) == 0
