from django.test import TestCase
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.notifications.models import Notification, NotificationPreference

class NotificationModelTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Toscana")
        self.user = User.objects.create_user(email="chef@toscana.com", password="Password123!")

    def test_notification_and_preference_creation(self):
        """Notification and preference creation store valid data."""
        notification = Notification.objects.create(
            restaurant=self.restaurant,
            recipient=self.user,
            notification_type="INVENTORY_LOW_STOCK",
            severity="WARNING",
            title="Low Stock",
            message="Olive oil is below 5L",
        )
        self.assertFalse(notification.is_read)
        self.assertEqual(str(notification), f"[WARNING] Low Stock -> {self.user.email}")

        pref = NotificationPreference.objects.create(
            restaurant=self.restaurant,
            user=self.user,
            in_app_enabled=True,
            realtime_enabled=True,
        )
        self.assertTrue(pref.low_stock_alerts)
