from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService
from apps.billing.services import BillingService, PaymentService

class ReportAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.user = User.objects.create_user(
            email="owner@roma.com",
            password="OwnerPassword123!",
            first_name="Fabio",
            last_name="Owner",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.user,
            name="Ristorante Roma",
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "owner@roma.com", "password": "OwnerPassword123!"},
            content_type="application/json",
        )
        self.token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

        self.cat = MenuCategory.objects.create(restaurant=self.restaurant, name="Pizzas")
        self.pizza = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.cat,
            name="Margherita",
            price=Decimal("15.00"),
            is_available=True,
            is_active=True,
        )

        order = OrderService.create_order(
            restaurant=self.restaurant,
            user=self.user,
            items_data=[{"menu_item_id": str(self.pizza.id), "quantity": 2}],
        )
        bill = BillingService.create_bill_for_order(restaurant=self.restaurant, order=order, user=self.user)
        PaymentService.process_payment(
            restaurant=self.restaurant,
            bill=bill,
            payment_method="CARD",
            amount=bill.grand_total,
            user=self.user,
        )

    def test_report_api_endpoints(self):
        """Dashboard, Sales, Payments, and Popular Menu endpoints return 200 with data."""
        # 1. Dashboard summary
        dash_res = self.client.get(reverse("report_dashboard") + "?preset=LAST_7_DAYS", **self.auth_headers)
        self.assertEqual(dash_res.status_code, 200)
        self.assertEqual(dash_res.json()["data"]["orders"]["total_orders"], 1)

        # 2. Sales report
        sales_res = self.client.get(reverse("report_sales") + "?preset=TODAY", **self.auth_headers)
        self.assertEqual(sales_res.status_code, 200)
        self.assertEqual(sales_res.json()["data"]["summary"]["gross_sales"], "30.00")

        # 3. Payments report
        pay_res = self.client.get(reverse("report_payments") + "?preset=LAST_30_DAYS", **self.auth_headers)
        self.assertEqual(pay_res.status_code, 200)
        self.assertEqual(pay_res.json()["data"]["total_transactions"], 1)

        # 4. Popular items
        menu_res = self.client.get(reverse("report_popular_menu") + "?preset=LAST_7_DAYS", **self.auth_headers)
        self.assertEqual(menu_res.status_code, 200)
        self.assertEqual(menu_res.json()["data"][0]["item_name"], "Margherita")
