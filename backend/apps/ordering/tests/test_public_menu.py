import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.restaurants.models import Restaurant, BusinessHour
from apps.settings.models import RestaurantConfiguration
from apps.menu.models import MenuCategory, MenuItem
from apps.ordering.services import PublicMenuService


@pytest.mark.django_db
class TestPublicMenu:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.restaurant = Restaurant.objects.create(
            name="Gourmet Burger Kitchen",
            slug="gbk-bistro",
            phone="1234567890",
            email="contact@gbk.com"
        )
        self.config = RestaurantConfiguration.objects.create(
            restaurant=self.restaurant,
            tagline="Best artisan burgers in town",
            online_ordering_enabled=True
        )

        self.cat_starters = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Starters",
            display_order=1,
            is_active=True
        )
        self.cat_mains = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Mains",
            display_order=2,
            is_active=True
        )
        self.cat_hidden = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Archived Specials",
            display_order=99,
            is_active=False
        )

        # Active & available item
        self.item_wings = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.cat_starters,
            name="Buffalo Wings",
            description="Crispy chicken wings with blue cheese dip",
            price=Decimal("12.50"),
            is_active=True,
            is_available=True
        )

        # Active but 86'd / out of stock
        self.item_burger = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.cat_mains,
            name="Truffle Wagyu Burger",
            description="Premium wagyu beef with truffle aioli",
            price=Decimal("22.00"),
            is_active=True,
            is_available=False
        )

        # Inactive item (hidden from catalog)
        self.item_old = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.cat_starters,
            name="Old Fries",
            price=Decimal("5.00"),
            is_active=False,
            is_available=True
        )

    def test_public_restaurant_profile_endpoint(self):
        res = self.client.get(f"/api/v1/public/restaurants/{self.restaurant.slug}/")
        assert res.status_code == 200
        assert res.data["name"] == "Gourmet Burger Kitchen"
        assert res.data["slug"] == "gbk-bistro"
        assert res.data["tagline"] == "Best artisan burgers in town"
        assert res.data["online_ordering_enabled"] is True

    def test_public_menu_filtering(self):
        res = self.client.get(f"/api/v1/public/restaurants/{self.restaurant.slug}/menu/")
        assert res.status_code == 200
        cats = res.data["categories"]
        cat_names = [c["name"] for c in cats]

        # Active categories present, inactive excluded
        assert "Starters" in cat_names
        assert "Mains" in cat_names
        assert "Archived Specials" not in cat_names

        # Check items in Starters: Buffalo Wings present, Old Fries excluded
        starters = next(c for c in cats if c["name"] == "Starters")
        item_names = [i["name"] for i in starters["items"]]
        assert "Buffalo Wings" in item_names
        assert "Old Fries" not in item_names

        # Check out-of-stock item is present in digital menu with is_available=False
        mains = next(c for c in cats if c["name"] == "Mains")
        burger = next(i for i in mains["items"] if i["name"] == "Truffle Wagyu Burger")
        assert burger["is_available"] is False

    def test_public_menu_search(self):
        res = self.client.get(f"/api/v1/public/restaurants/{self.restaurant.slug}/menu/?search=wings")
        assert res.status_code == 200
        cats = res.data["categories"]
        assert len(cats) == 1
        assert cats[0]["name"] == "Starters"
        assert cats[0]["items"][0]["name"] == "Buffalo Wings"
