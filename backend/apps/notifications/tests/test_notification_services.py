from django.test import TestCase
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.rbac.services import RBACService
from apps.restaurants.services import RestaurantService
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

class NotificationServiceTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()
        self.user = User.objects.create_user(email="manager@toscana.com", password="Password123!")
        self.restaurant, _ = RestaurantService.create_restaurant(user=self.user, name="Trattoria Toscana")

    def test_notification_creation_and_deduplication(self):
        """Notification creates once and skips duplicate when deduplication_key matches unread state."""
        n1 = NotificationService.create_notification(
            restaurant=self.restaurant,
            recipient=self.user,
            notification_type="INVENTORY_LOW_STOCK",
            severity="WARNING",
            title="Low Flour",
            message="Flour stock at 5kg",
            deduplication_key="low_stock:flour_001",
        )
        self.assertIsNotNone(n1)

        # Immediate retry with same key returns None without creating a second record
        n2 = NotificationService.create_notification(
            restaurant=self.restaurant,
            recipient=self.user,
            notification_type="INVENTORY_LOW_STOCK",
            severity="WARNING",
            title="Low Flour",
            message="Flour stock at 4kg",
            deduplication_key="low_stock:flour_001",
        )
        self.assertIsNone(n2)
        self.assertEqual(Notification.objects.filter(recipient=self.user).count(), 1)

    def test_mark_read_and_mark_all_read(self):
        """Mark as read single and bulk all operations."""
        n1 = NotificationService.create_notification(
            restaurant=self.restaurant,
            recipient=self.user,
            notification_type="SYSTEM_ALERT",
            title="Alert 1",
            message="Msg 1",
        )
        n2 = NotificationService.create_notification(
            restaurant=self.restaurant,
            recipient=self.user,
            notification_type="SYSTEM_ALERT",
            title="Alert 2",
            message="Msg 2",
        )

        NotificationService.mark_as_read(n1, self.user)
        n1.refresh_from_db()
        self.assertTrue(n1.is_read)
        self.assertIsNotNone(n1.read_at)

        # Mark all
        updated_count = NotificationService.mark_all_as_read(self.restaurant, self.user)
        self.assertEqual(updated_count, 1) # Only n2 remained unread
        self.assertEqual(Notification.objects.filter(recipient=self.user, is_read=False).count(), 0)
