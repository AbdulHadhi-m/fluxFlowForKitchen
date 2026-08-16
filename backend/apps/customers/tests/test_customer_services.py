import pytest
from decimal import Decimal
from apps.restaurants.models import Restaurant
from apps.customers.models import Customer, CustomerTag
from apps.customers.services import CustomerService

@pytest.mark.django_db
def test_customer_creation_and_visit_recording():
    restaurant = Restaurant.objects.create(
        name="Artisan Pizzeria",
        legal_name="Artisan LLC",
        slug="artisan-pizzeria",
        email="pizza@test.com",
    )
    tag = CustomerTag.objects.create(restaurant=restaurant, name="Regular")

    customer = CustomerService.create_customer(
        restaurant=restaurant,
        first_name="John",
        last_name="Doe",
        phone="+1555123456",
        email="john@doe.com",
        dietary_preferences=["Vegan"],
        tag_ids=[str(tag.id)],
    )

    assert customer.full_name == "John Doe"
    assert customer.tags.count() == 1

    # Record dining visit
    visit = CustomerService.record_visit(
        customer=customer,
        restaurant=restaurant,
        spend_amount=Decimal("125.50"),
        party_size=3,
        notes="Dinner with family",
    )

    customer.refresh_from_db()
    assert customer.total_visits == 1
    assert customer.total_spend == Decimal("125.50")
    assert customer.last_visit_at is not None
    assert visit.party_size == 3


@pytest.mark.django_db
def test_customer_merging():
    restaurant = Restaurant.objects.create(
        name="Bistro Parisien",
        legal_name="Bistro Paris LLC",
        slug="bistro-parisien",
        email="paris@test.com",
    )

    primary = CustomerService.create_customer(
        restaurant=restaurant,
        first_name="Jean",
        last_name="Luc",
        phone="+3312345678",
    )
    CustomerService.record_visit(customer=primary, restaurant=restaurant, spend_amount=Decimal("50.00"))

    duplicate = CustomerService.create_customer(
        restaurant=restaurant,
        first_name="Jean",
        last_name="L",
        phone="+3387654321",
    )
    CustomerService.record_visit(customer=duplicate, restaurant=restaurant, spend_amount=Decimal("75.00"))

    merged = CustomerService.merge_customers(
        primary_customer=primary,
        duplicate_customer=duplicate,
    )

    merged.refresh_from_db()
    assert merged.total_visits == 2
    assert merged.total_spend == Decimal("125.00")
    assert not Customer.objects.filter(id=duplicate.id).exists()
