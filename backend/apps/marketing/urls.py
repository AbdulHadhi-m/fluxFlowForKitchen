from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.marketing.views import (
    PromotionViewSet,
    CouponViewSet,
    CustomerSegmentViewSet,
    CampaignViewSet,
    MarketingConsentViewSet,
    MarketingAnalyticsView,
)

router = DefaultRouter()
router.register(r"promotions", PromotionViewSet, basename="promotion")
router.register(r"coupons", CouponViewSet, basename="coupon")
router.register(r"segments", CustomerSegmentViewSet, basename="customer-segment")
router.register(r"campaigns", CampaignViewSet, basename="campaign")
router.register(r"consent", MarketingConsentViewSet, basename="marketing-consent")

urlpatterns = [
    path("analytics/", MarketingAnalyticsView.as_view(), name="marketing-analytics"),
    path("", include(router.urls)),
]
