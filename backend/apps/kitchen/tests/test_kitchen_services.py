from decimal import Decimal
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.orders.models import Order
from apps.kitchen.models import KitchenTicket
from apps.kitchen.services import KitchenService

class KitchenServiceTests(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Trattoria Romana")
        self.user = User.objects.create_user(email="chef@trattoria.com", password="Password123!")
        self.table = RestaurantTable.objects.create(
            restaurant=self.restaurant,
            name="T01",
            capacity=4,
            status=RestaurantTable.TableStatus.OCCUPIED,
        )
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            order_number="ORD-000001",
            table=self.table,
            created_by=self.user,
            status=Order.OrderStatus.PLACED,
        )
        self.ticket = KitchenService.create_ticket_for_order(self.order)

    def test_kitchen_lifecycle_transitions(self):
        """NEW -> PREPARING -> READY -> COMPLETED."""
        self.assertEqual(self.ticket.status, KitchenTicket.KitchenStatus.NEW)

        # 1. Start
        KitchenService.start_preparing(self.ticket)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, KitchenTicket.KitchenStatus.PREPARING)
        self.assertIsNotNone(self.ticket.started_at)

        # 2. Ready
        KitchenService.mark_ready(self.ticket)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, KitchenTicket.KitchenStatus.READY)
        self.assertIsNotNone(self.ticket.ready_at)

        # 3. Complete
        KitchenService.complete_ticket(self.ticket)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, KitchenTicket.KitchenStatus.COMPLETED)
        self.assertIsNotNone(self.ticket.completed_at)

        # Order status and table availability synced
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.OrderStatus.COMPLETED)
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, RestaurantTable.TableStatus.AVAILABLE)

    def test_invalid_transition_rejection(self):
        """Cannot start preparation when ticket is already COMPLETED."""
        self.ticket.status = KitchenTicket.KitchenStatus.COMPLETED
        self.ticket.save()

        with self.assertRaises(ValidationError):
            KitchenService.start_preparing(self.ticket)
