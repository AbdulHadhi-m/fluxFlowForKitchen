from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.delivery.views import (
    DeliveryZoneViewSet,
    DeliveryDriverViewSet,
    DeliveryViewSet,
    CustomerAddressViewSet,
    PublicDeliveryEstimateView,
)

router = DefaultRouter()
router.register(r"zones", DeliveryZoneViewSet, basename="delivery-zones")
router.register(r"drivers", DeliveryDriverViewSet, basename="delivery-drivers")
router.register(r"addresses", CustomerAddressViewSet, basename="customer-addresses")
router.register(r"", DeliveryViewSet, basename="deliveries")

urlpatterns = [
    path("estimate/", PublicDeliveryEstimateView.as_view(), name="delivery-estimate"),
    path("estimate/<slug:slug>/", PublicDeliveryEstimateView.as_view(), name="delivery-estimate-slug"),
    path("", include(router.urls)),
]
