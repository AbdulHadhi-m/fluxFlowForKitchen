from django.urls import path
from apps.ordering.views import (
    PublicRestaurantDetailView,
    PublicMenuView,
    QRTableValidateView,
    CartValidateView,
    OnlineCheckoutView,
    PublicOrderTrackingView,
    CustomerRegisterView,
    CustomerLoginView,
    CustomerOrdersView,
)

urlpatterns = [
    # Public Storefront & Digital Menu
    path("public/restaurants/<slug:slug>/", PublicRestaurantDetailView.as_view(), name="public-restaurant-detail"),
    path("public/restaurants/<slug:slug>/menu/", PublicMenuView.as_view(), name="public-restaurant-menu"),

    # QR & Cart & Checkout
    path("ordering/qr/validate/", QRTableValidateView.as_view(), name="qr-table-validate"),
    path("ordering/cart/validate/", CartValidateView.as_view(), name="cart-validate"),
    path("ordering/checkout/", OnlineCheckoutView.as_view(), name="online-checkout"),
    path("ordering/orders/<uuid:tracking_token>/", PublicOrderTrackingView.as_view(), name="public-order-track"),

    # Customer Portal
    path("customer/register/", CustomerRegisterView.as_view(), name="customer-register"),
    path("customer/login/", CustomerLoginView.as_view(), name="customer-login"),
    path("customer/orders/", CustomerOrdersView.as_view(), name="customer-orders"),
]
