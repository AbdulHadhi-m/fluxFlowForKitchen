from django.urls import path
from apps.loyalty.views import (
    LoyaltyProgramView,
    LoyaltyAccountListView,
    LoyaltyAccountDetailView,
    LoyaltyAccountTransactionsView,
    LoyaltyAccountAdjustView,
    MembershipTierListCreateView,
    RewardListCreateView,
    GiftCardListCreateView,
    GiftCardDetailView,
    GiftCardRedeemView,
)

urlpatterns = [
    path("loyalty/program/", LoyaltyProgramView.as_view(), name="loyalty-program"),
    path("loyalty/accounts/", LoyaltyAccountListView.as_view(), name="loyalty-account-list"),
    path("loyalty/accounts/<uuid:pk>/", LoyaltyAccountDetailView.as_view(), name="loyalty-account-detail"),
    path("loyalty/accounts/<uuid:pk>/transactions/", LoyaltyAccountTransactionsView.as_view(), name="loyalty-account-transactions"),
    path("loyalty/accounts/<uuid:pk>/adjust/", LoyaltyAccountAdjustView.as_view(), name="loyalty-account-adjust"),
    path("loyalty/tiers/", MembershipTierListCreateView.as_view(), name="loyalty-tier-list-create"),
    path("loyalty/rewards/", RewardListCreateView.as_view(), name="loyalty-reward-list-create"),
    path("gift-cards/", GiftCardListCreateView.as_view(), name="gift-card-list-create"),
    path("gift-cards/<uuid:pk>/", GiftCardDetailView.as_view(), name="gift-card-detail"),
    path("gift-cards/redeem/", GiftCardRedeemView.as_view(), name="gift-card-redeem"),
]
