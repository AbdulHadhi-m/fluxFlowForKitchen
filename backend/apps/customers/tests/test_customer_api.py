import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.customers.models import Customer

@pytest.mark.django_db
def test_customer_list_create_and_analytics_api():
    RBACService.seed_system_roles_and_permissions()

    user = User.objects.create_user(email="manager_crm@test.com", password="password123")
    restaurant, membership = RestaurantService.create_restaurant(
        user=user,
        name="CRM Bistro",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    # 1. Create customer
    create_resp = client.post("/api/v1/customers/", {
        "first_name": "Elena",
        "last_name": "Rostova",
        "phone": "+1444333222",
        "email": "elena@test.com",
        "dietary_preferences": ["Vegetarian"],
    }, format="json")
    assert create_resp.status_code == 201
    customer_id = create_resp.data["data"]["id"]

    # 2. List customers
    list_resp = client.get("/api/v1/customers/")
    assert list_resp.status_code == 200
    assert len(list_resp.data["data"]) == 1

    # 3. Analytics
    analytics_resp = client.get("/api/v1/customers/analytics/")
    assert analytics_resp.status_code == 200
    assert analytics_resp.data["data"]["total_customers"] == 1
