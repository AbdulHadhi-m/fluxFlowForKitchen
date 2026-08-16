from decimal import Decimal
from django.test import TestCase
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.orders.models import Order
from apps.kitchen.models import KitchenTicket

class KitchenModelTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Romana")
        self.user = User.objects.create_user(email="chef@trattoria.com", password="Password123!")
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            order_number="ORD-000001",
            created_by=self.user,
        )

    def test_kitchen_ticket_creation_and_defaults(self):
        """KitchenTicket initializes with status NEW."""
        ticket = KitchenTicket.objects.create(
            restaurant=self.restaurant,
            order=self.order,
        )
        self.assertEqual(ticket.status, KitchenTicket.KitchenStatus.NEW)
        self.assertEqual(ticket.priority, 0)
        self.assertIsNone(ticket.started_at)
