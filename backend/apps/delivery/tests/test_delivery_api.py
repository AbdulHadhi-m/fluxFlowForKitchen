import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.restaurants.services import RestaurantService
from apps.accounts.models import User
from apps.orders.models import Order
from apps.staff.services import StaffService
from apps.delivery.models import DeliveryZone, DeliveryDriver, Delivery


@pytest.mark.django_db
class TestDeliveryAPI:
    @pytest.fixture
    def client(self):
        return APIClient()

    @pytest.fixture
    def test_setup(self):
        owner = User.objects.create_user(email="owner@api.com", password="Password123!", first_name="Owner")
        restaurant, membership = RestaurantService.create_restaurant(
            user=owner,
            name="API Test Kitchen",
        )
        staff = StaffService.create_staff_member(
            restaurant=restaurant,
            email="manager@api.com",
            first_name="Manager",
            primary_role_identifier="MANAGER",
        )
        driver_staff = StaffService.create_staff_member(
            restaurant=restaurant,
            email="driver@api.com",
            first_name="Courier",
            primary_role_identifier="DELIVERY_DRIVER",
        )
        zone = DeliveryZone.objects.create(
            restaurant=restaurant,
            name="Zone 1",
            postal_codes=["90210"],
            fee=Decimal("4.00"),
            minimum_order=Decimal("15.00"),
        )
        driver = DeliveryDriver.objects.create(
            restaurant=restaurant,
            staff_profile=driver_staff,
            vehicle_type=DeliveryDriver.VehicleType.BIKE,
            availability_status=DeliveryDriver.AvailabilityStatus.AVAILABLE,
        )
        order = Order.objects.create(
            restaurant=restaurant,
            order_number="API-101",
            subtotal=Decimal("30.00"),
            status=Order.OrderStatus.PLACED,
            order_type=Order.OrderType.DELIVERY,
        )
        delivery = Delivery.objects.create(
            restaurant=restaurant,
            order=order,
            zone=zone,
            status=Delivery.DeliveryStatus.READY_FOR_DISPATCH,
            recipient_name="John Doe",
            recipient_phone="555-1111",
            address_line_1="100 Sunset Blvd",
            city="Beverly Hills",
            postal_code="90210",
            delivery_fee=Decimal("4.00"),
        )
        return {
            "restaurant": restaurant,
            "user": staff.user,
            "zone": zone,
            "driver": driver,
            "delivery": delivery,
        }

    def test_public_delivery_estimate_endpoint(self, client, test_setup):
        url = "/api/v1/delivery/estimate/"
        payload = {
            "restaurant_slug": test_setup["restaurant"].slug,
            "postal_code": "90210",
            "subtotal": "25.00",
        }
        res = client.post(url, payload, format="json")
        assert res.status_code == 200
        data = res.json()
        assert data["eligible"] is True
        assert data["zone_name"] == "Zone 1"
        assert Decimal(data["delivery_fee"]) == Decimal("4.00")

    def test_delivery_dispatch_actions(self, client, test_setup):
        user = test_setup["user"]
        restaurant = test_setup["restaurant"]
        delivery = test_setup["delivery"]
        driver = test_setup["driver"]

        client.force_authenticate(user=user)

        # 1. Assign driver
        res = client.post(
            f"/api/v1/delivery/{delivery.id}/assign/",
            {"driver_id": str(driver.id)},
            format="json",
            HTTP_X_RESTAURANT_ID=str(restaurant.id),
        )
        assert res.status_code == 200
        data = res.json()
        status_val = data.get("status") if isinstance(data, dict) else None
        assert status_val == Delivery.DeliveryStatus.ASSIGNED

        # 2. Mark picked up
        res_pickup = client.post(
            f"/api/v1/delivery/{delivery.id}/pickup/",
            {},
            format="json",
            HTTP_X_RESTAURANT_ID=str(restaurant.id),
        )
        assert res_pickup.status_code == 200
        data_pickup = res_pickup.json()
        assert data_pickup.get("status") == Delivery.DeliveryStatus.PICKED_UP

        # 3. Start delivery
        res_start = client.post(
            f"/api/v1/delivery/{delivery.id}/start/",
            {},
            format="json",
            HTTP_X_RESTAURANT_ID=str(restaurant.id),
        )
        assert res_start.status_code == 200
        data_start = res_start.json()
        assert data_start.get("status") == Delivery.DeliveryStatus.OUT_FOR_DELIVERY

        # 4. Complete delivery
        res_comp = client.post(
            f"/api/v1/delivery/{delivery.id}/complete/",
            {},
            format="json",
            HTTP_X_RESTAURANT_ID=str(restaurant.id),
        )
        assert res_comp.status_code == 200
        data_comp = res_comp.json()
        assert data_comp.get("status") == Delivery.DeliveryStatus.DELIVERED
