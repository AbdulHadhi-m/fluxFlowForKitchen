from django.test import TestCase
from django.db.utils import IntegrityError
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable

class TableModelTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Osteria Francescana")

    def test_unique_table_name_per_restaurant(self):
        """Verify unique table name/number per restaurant."""
        RestaurantTable.objects.create(
            restaurant=self.restaurant,
            name="T01",
            capacity=4,
            section="Main Dining",
        )

        with self.assertRaises(IntegrityError):
            RestaurantTable.objects.create(
                restaurant=self.restaurant,
                name="T01",  # Duplicate T01 in same restaurant
                capacity=2,
            )

    def test_same_table_number_allowed_in_different_restaurants(self):
        """Same table number 'T01' is valid across different restaurant organizations."""
        r2 = Restaurant.objects.create(name="Trattoria Roma")
        t1 = RestaurantTable.objects.create(restaurant=self.restaurant, name="T01", capacity=4)
        t2 = RestaurantTable.objects.create(restaurant=r2, name="T01", capacity=4)
        self.assertEqual(t1.name, t2.name)
        self.assertNotEqual(t1.restaurant_id, t2.restaurant_id)
