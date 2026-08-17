import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.restaurants.services import RestaurantService
from apps.accounts.models import User
from apps.staff.services import StaffService
from apps.delivery.models import DeliveryZone


@pytest.mark.django_db
class TestDeliveryTenantIsolation:
    @pytest.fixture
    def client(self):
        return APIClient()

    def test_tenant_isolation_on_zones_and_deliveries(self, client):
        # Restaurant A
        user_a = User.objects.create_user(email="owner_a@rest.com", password="Password123!")
        rest_a, _ = RestaurantService.create_restaurant(user=user_a, name="Rest A")
        staff_a = StaffService.create_staff_member(
            restaurant=rest_a, email="admin_a@rest.com", primary_role_identifier="MANAGER"
        )

        zone_a = DeliveryZone.objects.create(
            restaurant=rest_a, name="Zone A", postal_codes=["11111"], fee=Decimal("3.00")
        )

        # Restaurant B
        user_b = User.objects.create_user(email="owner_b@rest.com", password="Password123!")
        rest_b, _ = RestaurantService.create_restaurant(user=user_b, name="Rest B")
        staff_b = StaffService.create_staff_member(
            restaurant=rest_b, email="admin_b@rest.com", primary_role_identifier="MANAGER"
        )

        zone_b = DeliveryZone.objects.create(
            restaurant=rest_b, name="Zone B", postal_codes=["22222"], fee=Decimal("5.00")
        )

        # User A should only see Zone A
        client.force_authenticate(user=staff_a.user)
        res_a = client.get("/api/v1/delivery/zones/", HTTP_X_RESTAURANT_ID=str(rest_a.id))
        assert res_a.status_code == 200
        res_data_a = res_a.json()
        zone_list_a = res_data_a.get("data", []) if isinstance(res_data_a, dict) else res_data_a
        zone_ids_a = [z["id"] for z in zone_list_a]
        assert str(zone_a.id) in zone_ids_a
        assert str(zone_b.id) not in zone_ids_a

        # User B should only see Zone B
        client.force_authenticate(user=staff_b.user)
        res_b = client.get("/api/v1/delivery/zones/", HTTP_X_RESTAURANT_ID=str(rest_b.id))
        assert res_b.status_code == 200
        res_data_b = res_b.json()
        zone_list_b = res_data_b.get("data", []) if isinstance(res_data_b, dict) else res_data_b
        zone_ids_b = [z["id"] for z in zone_list_b]
        assert str(zone_b.id) in zone_ids_b
        assert str(zone_a.id) not in zone_ids_b
