from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.services import OrderService
from apps.billing.models import Bill

class BillingAPITests(TestCase):
    def setUp(self):
        RBACService.seed_system_roles_and_permissions()

        self.user = User.objects.create_user(
            email="cashier@ristorante.com",
            password="CashierPassword123!",
            first_name="Marco",
            last_name="Pierre",
        )
        self.restaurant, self.membership = RestaurantService.create_restaurant(
            user=self.user,
            name="Ristorante Di Marco",
        )
        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Pizza")
        self.item = MenuItem.objects.create(
            restaurant=self.restaurant,
            category=self.category,
            name="Margherita",
            price=Decimal("15.00"),
            is_available=True,
            is_active=True,
        )

        login_res = self.client.post(
            reverse("auth_login"),
            {"email": "cashier@ristorante.com", "password": "CashierPassword123!"},
            content_type="application/json",
        )
        self.token = login_res.json()["data"]["access_token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

        self.order = OrderService.create_order(
            restaurant=self.restaurant,
            user=self.user,
            items_data=[{"menu_item_id": str(self.item.id), "quantity": 2}],
        )

    def test_bill_generation_and_payment_api_flow(self):
        """Generate bill from order, record cash payment, and fetch finalized detail."""
        # 1. Eligible orders
        elig_res = self.client.get(reverse("billing_eligible_orders"), **self.auth_headers)
        self.assertEqual(elig_res.status_code, 200)
        self.assertEqual(len(elig_res.json()["data"]), 1)

        # 2. Create Bill
        create_res = self.client.post(
            reverse("bill_list_create"),
            {"order_id": str(self.order.id), "discount_type": "NONE"},
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(create_res.status_code, 201)
        bill_data = create_res.json()["data"]
        bill_id = bill_data["id"]
        self.assertEqual(bill_data["status"], "FINALIZED")
        self.assertEqual(bill_data["subtotal"], "30.00")

        # 3. Process Payment
        pay_url = reverse("bill_process_payment", kwargs={"bill_id": bill_id})
        pay_res = self.client.post(
            pay_url,
            {
                "amount": "31.50", # 30 + 5% tax = 31.50
                "payment_method": "CASH",
                "amount_tendered": "40.00",
            },
            content_type="application/json",
            **self.auth_headers,
        )
        self.assertEqual(pay_res.status_code, 200)
        self.assertEqual(pay_res.json()["data"]["bill"]["status"], "PAID")
        self.assertEqual(pay_res.json()["data"]["payment"]["change_returned"], "8.50")
