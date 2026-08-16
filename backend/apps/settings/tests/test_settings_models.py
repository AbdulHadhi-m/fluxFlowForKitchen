from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.settings.models import RestaurantConfiguration, UserPreference

class SettingsModelTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Toscana")
        self.user = User.objects.create_user(email="chef@toscana.com", password="Password123!")

    def test_configuration_creation_and_validation(self):
        """Configuration enforces critical >= warning and non-negative values."""
        config = RestaurantConfiguration.objects.create(
            restaurant=self.restaurant,
            kds_warning_threshold_minutes=15,
            kds_critical_threshold_minutes=30,
            default_tax_rate=Decimal("5.00"),
        )
        self.assertEqual(str(config), f"Settings for {self.restaurant.name}")

        # Invalid threshold: critical < warning
        config.kds_critical_threshold_minutes = 10
        with self.assertRaises(ValidationError):
            config.save()

    def test_user_preference_creation(self):
        """User preference stores themes and display density."""
        prefs = UserPreference.objects.create(
            user=self.user,
            theme="DARK",
            time_format="24H",
            table_density="COMPACT",
        )
        self.assertEqual(str(prefs), f"Preferences for {self.user.email}")
