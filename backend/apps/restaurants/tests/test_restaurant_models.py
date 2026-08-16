from datetime import time
from django.test import TestCase
from django.db.utils import IntegrityError
from apps.restaurants.models import Restaurant, BusinessHour

class RestaurantModelTests(TestCase):
    def test_restaurant_creation_and_auto_slug(self):
        """Verify automatic unique slug generation on restaurant creation."""
        r1 = Restaurant.objects.create(name="Bella Italia Trattoria")
        self.assertEqual(r1.slug, "bella-italia-trattoria")
        self.assertTrue(r1.is_active)
        self.assertEqual(r1.currency, "USD")

        # Duplicate name generates collision-safe slug
        r2 = Restaurant.objects.create(name="Bella Italia Trattoria")
        self.assertEqual(r2.slug, "bella-italia-trattoria-1")

    def test_business_hour_unique_day_constraint(self):
        """Verify duplicate day_of_week per restaurant is prohibited by DB constraint."""
        restaurant = Restaurant.objects.create(name="Bistro Paris")
        BusinessHour.objects.create(
            restaurant=restaurant,
            day_of_week=BusinessHour.DayOfWeek.MONDAY,
            opening_time=time(9, 0),
            closing_time=time(22, 0),
        )

        with self.assertRaises(IntegrityError):
            BusinessHour.objects.create(
                restaurant=restaurant,
                day_of_week=BusinessHour.DayOfWeek.MONDAY,
                opening_time=time(10, 0),
                closing_time=time(23, 0),
            )
