import pytest
from datetime import date, time
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.customers.models import Customer, ReservationStatus
from apps.customers.services import CustomerService, ReservationService

@pytest.mark.django_db
def test_reservation_creation_and_capacity_validation():
    restaurant = Restaurant.objects.create(
        name="Seafood Bay",
        legal_name="Bay LLC",
        slug="seafood-bay",
        email="bay@test.com",
    )
    table = RestaurantTable.objects.create(
        restaurant=restaurant,
        name="T01",
        capacity=2,
    )
    customer = CustomerService.create_customer(
        restaurant=restaurant,
        first_name="David",
        phone="+1999888777",
    )

    # Party size exceeds capacity -> should fail
    with pytest.raises(ValidationError):
        ReservationService.create_reservation(
            restaurant=restaurant,
            customer=customer,
            reservation_date=date(2026, 8, 20),
            reservation_time=time(19, 30),
            party_size=4,
            table=table,
        )

    # Valid party size
    res = ReservationService.create_reservation(
        restaurant=restaurant,
        customer=customer,
        reservation_date=date(2026, 8, 20),
        reservation_time=time(19, 30),
        party_size=2,
        table=table,
    )

    assert res.reservation_number.startswith("RES-20260820-")
    assert res.status == ReservationStatus.CONFIRMED

    # Status update to CHECKED_IN
    res = ReservationService.update_reservation_status(
        reservation=res,
        new_status=ReservationStatus.CHECKED_IN,
    )
    assert res.status == ReservationStatus.CHECKED_IN
    customer.refresh_from_db()
    assert customer.total_visits == 1
