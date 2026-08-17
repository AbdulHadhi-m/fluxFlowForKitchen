import pytest
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.finance.models import Account
from apps.finance.services import ChartOfAccountsService

@pytest.mark.django_db
class TestFinanceTenantIsolation:
    def test_chart_of_accounts_isolated_between_restaurants(self):
        r1 = Restaurant.objects.create(name="Restaurant One", slug="restaurant-one")
        r2 = Restaurant.objects.create(name="Restaurant Two", slug="restaurant-two")

        ChartOfAccountsService.seed_default_chart_of_accounts(r1)

        assert Account.objects.filter(restaurant=r1).count() >= 20
        assert Account.objects.filter(restaurant=r2).count() == 0

        ChartOfAccountsService.seed_default_chart_of_accounts(r2)
        assert Account.objects.filter(restaurant=r2).count() >= 20

        # Updating account in r1 does not alter r2
        acc_r1 = Account.objects.get(restaurant=r1, code="1000")
        acc_r1.name = "R1 Main Vault Cash"
        acc_r1.save()

        acc_r2 = Account.objects.get(restaurant=r2, code="1000")
        assert acc_r2.name == "Cash on Hand / Drawers"
