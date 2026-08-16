from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService
from apps.billing.services import BillingService, PaymentService

class ReportTenantIsolationTests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        # Restaurant 1
        self.user1 = User.objects.create_user(email="owner1@r1.com", password="Password123!")
        self.r1, _ = RestaurantService.create_restaurant(user=self.user1, name="R1 Trattoria")
        cat1 = MenuCategory.objects.create(restaurant=self.r1, name="Pasta")
        p1 = MenuItem.objects.create(restaurant=self.r1, category=cat1, name="Carbonara", price=Decimal("20.00"))
        o1 = OrderService.create_order(restaurant=self.r1, user=self.user1, items_data=[{"menu_item_id": str(p1.id), "quantity": 1}])
        b1 = BillingService.create_bill_for_order(restaurant=self.r1, order=o1, user=self.user1)
        PaymentService.process_payment(restaurant=self.r1, bill=b1, payment_method="CASH", amount=b1.grand_total, user=self.user1)

        # Restaurant 2
        self.user2 = User.objects.create_user(email="owner2@r2.com", password="Password123!")
        self.r2, _ = RestaurantService.create_restaurant(user=self.user2, name="R2 Pizzeria")
        cat2 = MenuCategory.objects.create(restaurant=self.r2, name="Pizza")
        p2 = MenuItem.objects.create(restaurant=self.r2, category=cat2, name="Quattro Formaggi", price=Decimal("100.00"))
        o2 = OrderService.create_order(restaurant=self.r2, user=self.user2, items_data=[{"menu_item_id": str(p2.id), "quantity": 5}]) # $500
        b2 = BillingService.create_bill_for_order(restaurant=self.r2, order=o2, user=self.user2)
        PaymentService.process_payment(restaurant=self.r2, bill=b2, payment_method="CARD", amount=b2.grand_total, user=self.user2)

        # Login User 1
        login1 = self.client.post(
            reverse("auth_login"),
            {"email": "owner1@r1.com", "password": "Password123!"},
            content_type="application/json",
        )
        self.token1 = login1.json()["data"]["access_token"]
        self.auth1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token1}"}

    def test_user1_reports_only_include_restaurant1_data(self):
        """User 1's sales report reflects $20 from R1, never $500 from R2."""
        res = self.client.get(reverse("report_sales") + "?preset=LAST_7_DAYS", **self.auth1_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data"]["summary"]["gross_sales"], "20.00")
        self.assertEqual(res.json()["data"]["summary"]["bill_count"], 1)

        menu_res = self.client.get(reverse("report_popular_menu") + "?preset=LAST_7_DAYS", **self.auth1_headers)
        self.assertEqual(menu_res.status_code, 200)
        item_names = [i["item_name"] for i in menu_res.json()["data"]]
        self.assertIn("Carbonara", item_names)
        self.assertNotIn("Quattro Formaggi", item_names)
