import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.restaurants.models import Restaurant
from apps.settings.models import RestaurantConfiguration
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.models import Order


@pytest.mark.django_db
class TestOrderingTenantIsolation:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        # Tenant A
        self.rest_a = Restaurant.objects.create(name="Restaurant A", slug="rest-a")
        RestaurantConfiguration.objects.create(restaurant=self.rest_a, online_ordering_enabled=True)
        self.table_a = RestaurantTable.objects.create(restaurant=self.rest_a, name="Table A1")
        self.cat_a = MenuCategory.objects.create(restaurant=self.rest_a, name="Cat A")
        self.item_a = MenuItem.objects.create(
            restaurant=self.rest_a, category=self.cat_a, name="Dish A", price=Decimal("15.00")
        )

        # Tenant B
        self.rest_b = Restaurant.objects.create(name="Restaurant B", slug="rest-b")
        RestaurantConfiguration.objects.create(restaurant=self.rest_b, online_ordering_enabled=True)
        self.table_b = RestaurantTable.objects.create(restaurant=self.rest_b, name="Table B1")
        self.cat_b = MenuCategory.objects.create(restaurant=self.rest_b, name="Cat B")
        self.item_b = MenuItem.objects.create(
            restaurant=self.rest_b, category=self.cat_b, name="Dish B", price=Decimal("25.00")
        )

    def test_public_menu_does_not_leak_cross_tenant_items(self):
        res_a = self.client.get(f"/api/v1/public/restaurants/{self.rest_a.slug}/menu/")
        assert res_a.status_code == 200
        items_a = [i["name"] for c in res_a.data["categories"] for i in c["items"]]
        assert "Dish A" in items_a
        assert "Dish B" not in items_a

    def test_cannot_order_tenant_b_item_in_tenant_a_checkout(self):
        # Attempt to checkout in Restaurant A with Restaurant B's menu item
        payload = {
            "restaurant_slug": "rest-a",
            "order_type": "DINE_IN",
            "items": [{"menu_item_id": str(self.item_b.id), "quantity": 1}]
        }
        res = self.client.post("/api/v1/ordering/checkout/", payload, format="json")
        assert res.status_code == 400

    def test_cannot_use_tenant_b_qr_in_tenant_a_checkout(self):
        # Attempt to use Table B's QR token with Restaurant A slug
        res = self.client.get(
            f"/api/v1/ordering/qr/validate/?restaurant_slug=rest-a&qr_token={self.table_b.qr_code_token}"
        )
        assert res.status_code == 404
