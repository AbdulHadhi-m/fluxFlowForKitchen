import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.settings.models import RestaurantConfiguration
from apps.menu.models import MenuCategory, MenuItem
from apps.billing.models import TaxRule
from apps.marketing.models import Promotion, PromotionType, Coupon, CouponStatus
from apps.ordering.services import CartValidationService


@pytest.mark.django_db
class TestCartValidation:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.client = APIClient()
        self.restaurant = Restaurant.objects.create(name="Validation Cafe", slug="val-cafe")
        self.config = RestaurantConfiguration.objects.create(
            restaurant=self.restaurant,
            tax_enabled=True,
            default_tax_rate=Decimal("10.00"),
            min_online_order_amount=Decimal("15.00"),
            max_online_order_amount=Decimal("500.00"),
        )
        self.tax_rule = TaxRule.objects.create(
            restaurant=self.restaurant,
            name="VAT 10%",
            rate=Decimal("10.00"),
            is_active=True
        )

        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Specials")
        self.item_pasta = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Truffle Pasta",
            price=Decimal("20.00"),
            is_active=True,
            is_available=True
        )
        self.item_drink = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Lemonade",
            price=Decimal("5.00"),
            is_active=True,
            is_available=True
        )
        self.item_soldout = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Sold Out Steak",
            price=Decimal("35.00"),
            is_active=True,
            is_available=False
        )

    def test_authoritative_price_calculation(self):
        # 1 Pasta ($20) + 2 Lemonades ($10) = Subtotal $30.00, Tax (10%) = $3.00, Total = $33.00
        payload = {
            "restaurant_slug": "val-cafe",
            "order_type": "DINE_IN",
            "items": [
                {"menu_item_id": str(self.item_pasta.id), "quantity": 1, "notes": "No parmesan"},
                {"menu_item_id": str(self.item_drink.id), "quantity": 2},
            ]
        }
        res = self.client.post("/api/v1/ordering/cart/validate/", payload, format="json")
        assert res.status_code == 200
        assert res.data["subtotal"] == "30.00"
        assert res.data["tax_amount"] == "3.00"
        assert res.data["total"] == "33.00"
        assert len(res.data["items"]) == 2

    def test_out_of_stock_item_rejection(self):
        payload = {
            "restaurant_slug": "val-cafe",
            "items": [
                {"menu_item_id": str(self.item_soldout.id), "quantity": 1},
            ]
        }
        res = self.client.post("/api/v1/ordering/cart/validate/", payload, format="json")
        assert res.status_code == 400
        assert "out-of-stock" in str(res.data)

    def test_minimum_spend_enforcement(self):
        # 1 Lemonade ($5.00) < min ($15.00)
        payload = {
            "restaurant_slug": "val-cafe",
            "items": [
                {"menu_item_id": str(self.item_drink.id), "quantity": 1},
            ]
        }
        res = self.client.post("/api/v1/ordering/cart/validate/", payload, format="json")
        assert res.status_code == 400
        assert "Minimum order amount is $15.00" in str(res.data)

    def test_coupon_discount_calculation(self):
        now = timezone.now()
        promo = Promotion.objects.create(
            restaurant=self.restaurant,
            name="20% Discount",
            promotion_type=PromotionType.PERCENTAGE_DISCOUNT,
            discount_value=Decimal("20.00"),
            status="ACTIVE",
            start_at=now - timedelta(days=1),
            coupon_required=True
        )
        coupon = Coupon.objects.create(
            restaurant=self.restaurant,
            promotion=promo,
            code="SUMMER20",
            status=CouponStatus.ACTIVE,
            valid_from=now - timedelta(days=1)
        )

        # 2 Pastas ($40.00). 20% discount = $8.00. Taxable base = $32.00, Tax (10%) = $3.20, Total = $35.20
        payload = {
            "restaurant_slug": "val-cafe",
            "items": [{"menu_item_id": str(self.item_pasta.id), "quantity": 2}],
            "coupon_code": "SUMMER20"
        }
        res = self.client.post("/api/v1/ordering/cart/validate/", payload, format="json")
        assert res.status_code == 200
        assert res.data["subtotal"] == "40.00"
        assert res.data["discount_amount"] == "8.00"
        assert res.data["tax_amount"] == "3.20"
        assert res.data["total"] == "35.20"
        assert res.data["applied_promotion"]["coupon_code"] == "SUMMER20"
