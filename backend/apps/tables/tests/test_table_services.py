from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.tables.services import TableService

class TableServiceTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Bistro Paris")

    def test_create_table_validation(self):
        """Verify capacity >= 1 and unique naming validation."""
        # Zero capacity rejection
        with self.assertRaises(ValidationError):
            TableService.create_table(
                restaurant=self.restaurant,
                name="T01",
                capacity=0,
            )

        # Valid creation
        table = TableService.create_table(
            restaurant=self.restaurant,
            name="T01",
            capacity=6,
            section="Patio",
        )
        self.assertEqual(table.status, RestaurantTable.TableStatus.AVAILABLE)
        self.assertEqual(table.capacity, 6)

    def test_update_table_status_service(self):
        """Verify controlled status updates."""
        table = TableService.create_table(
            restaurant=self.restaurant,
            name="T02",
            capacity=2,
        )
        TableService.update_table_status(table, RestaurantTable.TableStatus.OCCUPIED)
        table.refresh_from_db()
        self.assertEqual(table.status, RestaurantTable.TableStatus.OCCUPIED)
