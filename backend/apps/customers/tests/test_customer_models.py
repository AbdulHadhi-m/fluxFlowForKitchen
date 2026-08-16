import pytest
from apps.restaurants.models import Restaurant
from apps.customers.models import Customer, CustomerTag, CustomerVisit, Reservation, ReservationStatus

@pytest.mark.django_db
def test_customer_model_creation():
    restaurant = Restaurant.objects.create(
        name="The Gourmet Bistro",
        legal_name="Bistro LLC",
        slug="the-gourmet-bistro",
        email="bistro@test.com",
    )
    customer = Customer.objects.create(
        restaurant=restaurant,
        first_name="Alice",
        last_name="Smith",
        phone="+1234567890",
        email="alice@example.com",
        dietary_preferences=["Gluten-Free"],
        allergies=["Peanuts"],
    )

    assert customer.full_name == "Alice Smith"
    assert customer.total_visits == 0
    assert customer.total_spend == 0.00
    assert "Gluten-Free" in customer.dietary_preferences
    assert str(customer) == "Alice Smith (+1234567890)"


@pytest.mark.django_db
def test_customer_tag_and_reservation_model():
    restaurant = Restaurant.objects.create(
        name="Trattoria Bella",
        legal_name="Trattoria LLC",
        slug="trattoria-bella",
        email="trattoria@test.com",
    )
    tag = CustomerTag.objects.create(
        restaurant=restaurant,
        name="VIP",
        color="purple",
    )
    customer = Customer.objects.create(
        restaurant=restaurant,
        first_name="Marco",
        phone="+9876543210",
    )
    customer.tags.add(tag)

    assert customer.tags.count() == 1
    assert customer.tags.first().name == "VIP"
