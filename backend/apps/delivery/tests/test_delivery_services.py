import pytest
from decimal import Decimal
from apps.restaurants.models import Restaurant
from apps.restaurants.services import RestaurantService
from apps.accounts.models import User
from apps.orders.models import Order
from apps.staff.services import StaffService
from apps.delivery.models import Delivery, DeliveryDriver, DeliveryZone
from apps.delivery.services import DeliveryService


@pytest.mark.django_db
class TestDeliveryServices:
    @pytest.fixture
    def setup_data(self):
        user = User.objects.create_user(
            email="owner@kitchen.com", password="Password123!", first_name="Owner"
        )
        restaurant, _ = RestaurantService.create_restaurant(
            user=user,
            name="Delivery Test Kitchen",
        )
        staff = StaffService.create_staff_member(
            restaurant=restaurant,
            email="courier@kitchen.com",
            first_name="Speedy",
            last_name="Rider",
            primary_role_identifier="DELIVERY_DRIVER",
        )
        driver = DeliveryDriver.objects.create(
            restaurant=restaurant,
            staff_profile=staff,
            vehicle_type=DeliveryDriver.VehicleType.BIKE,
            vehicle_number="NY-9921",
            phone="+1555999000",
            availability_status=DeliveryDriver.AvailabilityStatus.AVAILABLE,
        )
        order = Order.objects.create(
            restaurant=restaurant,
            order_number="DEL-1001",
            subtotal=Decimal("45.00"),
            total=Decimal("45.00"),
            status=Order.OrderStatus.PLACED,
            order_type=Order.OrderType.DELIVERY,
        )
        return {
            "restaurant": restaurant,
            "user": staff.user,
            "staff": staff,
            "driver": driver,
            "order": order,
        }

    def test_create_delivery_and_address_snapshot(self, setup_data):
        order = setup_data["order"]
        address_data = {
            "recipient_name": "Alice Green",
            "phone": "+1555123456",
            "address_line_1": "742 Evergreen Terrace",
            "city": "Springfield",
            "state": "OR",
            "postal_code": "97477",
            "delivery_instructions": "Leave at front porch",
        }
        delivery = DeliveryService.create_delivery_for_order(
            order=order,
            address_data=address_data,
            delivery_fee=Decimal("5.00"),
        )
        assert delivery.status == Delivery.DeliveryStatus.PENDING
        assert delivery.recipient_name == "Alice Green"
        assert delivery.address_line_1 == "742 Evergreen Terrace"
        assert delivery.postal_code == "97477"
        assert delivery.delivery_fee == Decimal("5.00")
        assert len(delivery.delivery_pin) >= 4

    def test_assign_unassign_and_lifecycle(self, setup_data):
        order = setup_data["order"]
        driver = setup_data["driver"]
        actor = setup_data["user"]

        address_data = {
            "recipient_name": "Bob Smith",
            "phone": "+1555654321",
            "address_line_1": "100 Broadway",
            "city": "New York",
            "postal_code": "10001",
        }
        delivery = DeliveryService.create_delivery_for_order(
            order=order, address_data=address_data, actor_user=actor
        )

        # 1. Assign driver
        assigned = DeliveryService.assign_driver(delivery=delivery, driver=driver, actor_user=actor)
        assert assigned.status == Delivery.DeliveryStatus.ASSIGNED
        assert assigned.assigned_driver_id == driver.id

        driver.refresh_from_db()
        assert driver.active_deliveries_count == 1
        assert driver.availability_status == DeliveryDriver.AvailabilityStatus.BUSY

        # 2. Mark picked up
        picked = DeliveryService.mark_picked_up(delivery=assigned, actor_user=actor)
        assert picked.status == Delivery.DeliveryStatus.PICKED_UP
        assert picked.picked_up_at is not None

        # 3. Start delivery (out for delivery)
        en_route = DeliveryService.start_delivery(delivery=picked, actor_user=actor)
        assert en_route.status == Delivery.DeliveryStatus.OUT_FOR_DELIVERY

        # 4. Complete delivery
        delivered = DeliveryService.complete_delivery(delivery=en_route, actor_user=actor)
        assert delivered.status == Delivery.DeliveryStatus.DELIVERED
        assert delivered.delivered_at is not None

        # Driver should be released and marked available
        driver.refresh_from_db()
        assert driver.active_deliveries_count == 0
        assert driver.availability_status == DeliveryDriver.AvailabilityStatus.AVAILABLE
        assert driver.total_completed_deliveries == 1

        # Parent order should be COMPLETED
        order.refresh_from_db()
        assert order.status == Order.OrderStatus.COMPLETED

    def test_fail_and_cancel_delivery(self, setup_data):
        order = setup_data["order"]
        driver = setup_data["driver"]
        actor = setup_data["user"]

        address_data = {"recipient_name": "Charlie", "phone": "555-0000", "address_line_1": "1 Road", "city": "City", "postal_code": "00000"}
        delivery = DeliveryService.create_delivery_for_order(order=order, address_data=address_data, actor_user=actor)
        DeliveryService.assign_driver(delivery=delivery, driver=driver, actor_user=actor)

        # Fail delivery
        failed = DeliveryService.fail_delivery(delivery=delivery, reason="Customer unreachable", actor_user=actor)
        assert failed.status == Delivery.DeliveryStatus.FAILED
        assert failed.failure_reason == "Customer unreachable"

        driver.refresh_from_db()
        assert driver.active_deliveries_count == 0
        assert driver.availability_status == DeliveryDriver.AvailabilityStatus.AVAILABLE
