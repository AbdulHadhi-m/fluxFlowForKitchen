import pytest
from decimal import Decimal
from apps.restaurants.models import Restaurant
from apps.settings.models import RestaurantConfiguration
from apps.delivery.models import DeliveryZone
from apps.delivery.services import DeliveryZoneService


@pytest.mark.django_db
class TestDeliveryZones:
    @pytest.fixture
    def restaurant(self):
        return Restaurant.objects.create(name="Zone Test Bistro", slug="zone-test-bistro")

    @pytest.fixture
    def setup_zones(self, restaurant):
        config, _ = RestaurantConfiguration.objects.get_or_create(
            restaurant=restaurant,
            defaults={
                "default_delivery_fee": Decimal("6.00"),
                "free_delivery_threshold": Decimal("50.00"),
            },
        )
        config.default_delivery_fee = Decimal("6.00")
        config.free_delivery_threshold = Decimal("50.00")
        config.save()

        zone_a = DeliveryZone.objects.create(
            restaurant=restaurant,
            name="Downtown Core",
            postal_codes=["10001", "10002", "10003"],
            fee=Decimal("3.50"),
            minimum_order=Decimal("20.00"),
            estimated_minutes=25,
            priority=10,
            is_active=True,
        )

        zone_b = DeliveryZone.objects.create(
            restaurant=restaurant,
            name="Outer Suburbs",
            postal_codes=["100", "101"],  # Prefix matching
            fee=Decimal("7.00"),
            minimum_order=Decimal("30.00"),
            estimated_minutes=45,
            priority=5,
            is_active=True,
        )

        return zone_a, zone_b

    def test_zone_matching_exact_and_priority(self, restaurant, setup_zones):
        zone_a, zone_b = setup_zones
        matched = DeliveryZoneService.match_zone_for_address(restaurant=restaurant, postal_code="10001")
        assert matched is not None
        assert matched.id == zone_a.id

        # Prefix match for 10150 matches zone_b
        matched_prefix = DeliveryZoneService.match_zone_for_address(restaurant=restaurant, postal_code="10150")
        assert matched_prefix is not None
        assert matched_prefix.id == zone_b.id

        # Non-matching postal code returns None
        assert DeliveryZoneService.match_zone_for_address(restaurant=restaurant, postal_code="90210") is None

    def test_fee_calculation_with_free_delivery_threshold(self, restaurant, setup_zones):
        zone_a, _ = setup_zones

        # Under threshold: zone fee applies
        fee = DeliveryZoneService.calculate_delivery_fee(
            restaurant=restaurant, subtotal=Decimal("35.00"), zone=zone_a
        )
        assert fee == Decimal("3.50")

        # Over threshold ($50.00): free delivery applies ($0.00)
        free_fee = DeliveryZoneService.calculate_delivery_fee(
            restaurant=restaurant, subtotal=Decimal("55.00"), zone=zone_a
        )
        assert free_fee == Decimal("0.00")

        # No zone matched: fallback to default_delivery_fee ($6.00)
        default_fee = DeliveryZoneService.calculate_delivery_fee(
            restaurant=restaurant, subtotal=Decimal("25.00"), zone=None
        )
        assert default_fee == Decimal("6.00")

    def test_estimate_delivery_window(self, restaurant, setup_zones):
        zone_a, _ = setup_zones
        min_mins, max_mins, label = DeliveryZoneService.estimate_delivery_window(
            restaurant=restaurant, zone=zone_a
        )
        assert min_mins > 0
        assert max_mins > min_mins
        assert "mins" in label
