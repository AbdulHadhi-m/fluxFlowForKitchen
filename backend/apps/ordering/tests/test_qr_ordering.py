import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.restaurants.models import Restaurant
from apps.settings.models import RestaurantConfiguration
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.models import Order


@pytest.mark.django_db
class TestQROrdering:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.restaurant = Restaurant.objects.create(name="QR Trattoria", slug="qr-trattoria")
        self.config = RestaurantConfiguration.objects.create(
            restaurant=self.restaurant,
            qr_ordering_enabled=True,
            online_ordering_enabled=True
        )

        self.table = RestaurantTable.objects.create(
            restaurant=self.restaurant,
            name="Table 7",
            section="Patio",
            capacity=4
        )

        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Pasta")
        self.item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Ravioli",
            price=Decimal("16.00"),
            is_active=True,
            is_available=True
        )

    def test_qr_validation_success(self):
        token = self.table.qr_code_token
        res = self.client.get(f"/api/v1/ordering/qr/validate/?restaurant_slug=qr-trattoria&qr_token={token}")
        assert res.status_code == 200
        assert res.data["table_name"] == "Table 7"
        assert res.data["section"] == "Patio"
        assert res.data["table_id"] == str(self.table.id)

    def test_qr_checkout_flow(self):
        token = self.table.qr_code_token
        payload = {
            "restaurant_slug": "qr-trattoria",
            "order_type": "DINE_IN",
            "qr_token": token,
            "items": [{"menu_item_id": str(self.item.id), "quantity": 2}],
            "guest_info": {"name": "Table Guest"}
        }

        res = self.client.post("/api/v1/ordering/checkout/", payload, format="json")
        assert res.status_code == 201
        order = Order.objects.get(order_number=res.data["order_number"])
        assert order.source == Order.OrderSource.QR
        assert order.table == self.table
        assert order.subtotal == Decimal("32.00")
