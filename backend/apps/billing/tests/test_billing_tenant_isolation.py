from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService
from apps.billing.services import BillingService

class BillingTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.user1 = User.objects.create_user(email="cashier1@r1.com", password="Password123!")
        self.r1, _ = RestaurantService.create_restaurant(user=self.user1, name="R1 Trattoria")
        self.cat1 = MenuCategory.objects.create(restaurant=self.r1, name="Mains")
        self.item1 = MenuItem.objects.create(restaurant=self.r1, category=self.cat1, name="Pizza", price=Decimal("20.00"), is_available=True, is_active=True)
        self.order1 = OrderService.create_order(
            restaurant=self.r1,
            user=self.user1,
            items_data=[{"menu_item_id": str(self.item1.id), "quantity": 1}],
        )
        self.bill1 = BillingService.create_bill_for_order(
            restaurant=self.r1,
            user=self.user1,
            order=self.order1,
        )

        # Restaurant 2
        self.user2 = User.objects.create_user(email="cashier2@r2.com", password="Password123!")
        self.r2, _ = RestaurantService.create_restaurant(user=self.user2, name="R2 Osteria")
        self.cat2 = MenuCategory.objects.create(restaurant=self.r2, name="Mains")
        self.item2 = MenuItem.objects.create(restaurant=self.r2, category=self.cat2, name="Pasta", price=Decimal("15.00"), is_available=True, is_active=True)
        self.order2 = OrderService.create_order(
            restaurant=self.r2,
            user=self.user2,
            items_data=[{"menu_item_id": str(self.item2.id), "quantity": 1}],
        )
        self.bill2 = BillingService.create_bill_for_order(
            restaurant=self.r2,
            user=self.user2,
            order=self.order2,
        )

        # Login User 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "cashier1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.token1 = login1.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token1}"}

    def test_cashier_cannot_access_or_pay_another_restaurants_bill(self):
        """Cashier 1 cannot view or pay Bill 2 belonging to Restaurant 2."""
        # Detail Bill 2 -> 404
        detail_url = reverse("bill_detail", kwargs={"bill_id": self.bill2.id})
        detail_res = self.client.get(detail_url, **self.auth1_headers)
        self.assertEqual(detail_res.status_code, 404)

        # Process payment on Bill 2 -> 404
        pay_url = reverse("bill_process_payment", kwargs={"bill_id": self.bill2.id})
        pay_res = self.client.post(
            pay_url,
            {"amount": "10.00", "payment_method": "CASH"},
            content_type="application/json",
            **self.auth1_headers,
        )
        self.assertEqual(pay_res.status_code, 404)
