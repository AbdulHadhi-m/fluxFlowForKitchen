import pytest
from decimal import Decimal
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.finance.models import Account, AccountCategory, NormalBalance
from apps.finance.services import ChartOfAccountsService

@pytest.mark.django_db
class TestChartOfAccounts:
    @pytest.fixture
    def restaurant(self):
        return Restaurant.objects.create(name="Trattoria Bella", slug="trattoria-bella")

    def test_seed_default_chart_of_accounts(self, restaurant):
        accounts = ChartOfAccountsService.seed_default_chart_of_accounts(restaurant)
        assert len(accounts) >= 20

        cash_acc = Account.objects.get(restaurant=restaurant, code="1000")
        assert cash_acc.name == "Cash on Hand / Drawers"
        assert cash_acc.category == AccountCategory.ASSET
        assert cash_acc.normal_balance == NormalBalance.DEBIT
        assert cash_acc.is_system_account is True

        sales_acc = Account.objects.get(restaurant=restaurant, code="4000")
        assert sales_acc.category == AccountCategory.REVENUE
        assert sales_acc.normal_balance == NormalBalance.CREDIT

    def test_get_system_account_auto_seeds(self, restaurant):
        assert Account.objects.filter(restaurant=restaurant).count() == 0
        acc = ChartOfAccountsService.get_system_account(restaurant, "2000")
        assert acc.code == "2000"
        assert acc.name == "Accounts Payable - Suppliers"
        assert Account.objects.filter(restaurant=restaurant).count() > 0
