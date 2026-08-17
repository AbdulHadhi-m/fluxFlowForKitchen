import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.restaurants.models import Restaurant
from apps.settings.models import RestaurantConfiguration
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.models import Order
from apps.kitchen.models import KitchenTicket
from apps.billing.models import Bill, Payment


@pytest.mark.django_db
class TestOnlineCheckout:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.restaurant = Restaurant.objects.create(name="Checkout Diner", slug="checkout-diner")
        self.config = RestaurantConfiguration.objects.create(
            restaurant=self.restaurant,
            online_ordering_enabled=True,
            qr_ordering_enabled=True,
            takeaway_ordering_enabled=True,
            guest_checkout_enabled=True
        )

        self.table = RestaurantTable.objects.create(
            restaurant=self.restaurant,
            name="T01",
            capacity=4
        )

        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Fast Food")
        self.item_pizza = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Margherita Pizza",
            price=Decimal("18.00"),
            is_active=True,
            is_available=True
        )

    def test_guest_dinein_checkout(self):
        payload = {
            "restaurant_slug": "checkout-diner",
            "order_type": "DINE_IN",
            "table_id": str(self.table.id),
            "items": [
                {"menu_item_id": str(self.item_pizza.id), "quantity": 2, "notes": "Extra crispy"}
            ],
            "guest_info": {
                "name": "Jane Doe",
                "phone": "555-1234",
                "email": "jane@example.com"
            },
            "payment_method": "PAY_AT_COUNTER",
            "special_instructions": "Please bring napkins"
        }

        res = self.client.post("/api/v1/ordering/checkout/", payload, format="json")
        assert res.status_code == 201
        order_number = res.data["order_number"]
        tracking_token = res.data["tracking_token"]

        # Verify Order in Database
        order = Order.objects.get(order_number=order_number)
        assert order.restaurant == self.restaurant
        assert order.table == self.table
        assert order.order_type == Order.OrderType.DINE_IN
        assert order.source in [Order.OrderSource.ONLINE, Order.OrderSource.QR]
        assert order.guest_name == "Jane Doe"
        assert order.guest_phone == "555-1234"
        assert order.items.count() == 1
        assert order.items.first().quantity == 2
        assert order.items.first().item_name_snapshot == "Margherita Pizza"

        # Verify Kitchen Ticket was automatically generated
        ticket = KitchenTicket.objects.filter(order=order).first()
        assert ticket is not None
        assert ticket.status == KitchenTicket.KitchenStatus.NEW

        # Verify Bill was created
        bill = Bill.objects.filter(order=order).first()
        assert bill is not None

        # Verify Public Order Tracking Endpoint
        res_track = self.client.get(f"/api/v1/ordering/orders/{tracking_token}/")
        assert res_track.status_code == 200
        assert res_track.data["order_number"] == order_number
        assert res_track.data["guest_name"] == "Jane Doe"
        assert res_track.data["display_stage"] == "PLACED"

    def test_takeaway_checkout(self):
        payload = {
            "restaurant_slug": "checkout-diner",
            "order_type": "TAKEAWAY",
            "items": [
                {"menu_item_id": str(self.item_pizza.id), "quantity": 1}
            ],
            "guest_info": {
                "name": "Bob Smith",
                "phone": "555-8888",
                "email": "bob@example.com"
            },
            "payment_method": "ONLINE_CARD"
        }

        res = self.client.post("/api/v1/ordering/checkout/", payload, format="json")
        assert res.status_code == 201
        order = Order.objects.get(order_number=res.data["order_number"])
        assert order.table is None
        assert order.order_type == Order.OrderType.TAKEAWAY

        # Verify Paid status on bill
        bill = Bill.objects.get(order=order)
        assert bill.status == Bill.BillStatus.PAID
