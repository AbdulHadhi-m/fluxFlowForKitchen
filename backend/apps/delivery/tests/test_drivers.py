import pytest
from apps.restaurants.services import RestaurantService
from apps.accounts.models import User
from apps.staff.services import StaffService
from apps.delivery.models import DeliveryDriver
from apps.delivery.services import DriverService


@pytest.mark.django_db
class TestDeliveryDrivers:
    @pytest.fixture
    def setup_driver(self):
        user = User.objects.create_user(email="owner@cafe.com", password="Password123!", first_name="Owner")
        restaurant, _ = RestaurantService.create_restaurant(
            user=user,
            name="Driver Test Cafe",
        )
        staff = StaffService.create_staff_member(
            restaurant=restaurant,
            email="rider@cafe.com",
            first_name="Dave",
            primary_role_identifier="DELIVERY_DRIVER",
        )
        driver = DeliveryDriver.objects.create(
            restaurant=restaurant,
            staff_profile=staff,
            vehicle_type=DeliveryDriver.VehicleType.CAR,
            vehicle_number="NY-1234",
            availability_status=DeliveryDriver.AvailabilityStatus.AVAILABLE,
        )
        return driver, staff.user

    def test_update_driver_availability(self, setup_driver):
        drv, user = setup_driver
        updated = DriverService.update_driver_availability(
            driver=drv,
            status_value=DeliveryDriver.AvailabilityStatus.OFFLINE,
            actor_user=user,
        )
        assert updated.availability_status == DeliveryDriver.AvailabilityStatus.OFFLINE
