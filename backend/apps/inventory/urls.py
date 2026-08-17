from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.inventory.views import (
    InventoryItemViewSet,
    InventoryBatchViewSet,
    StockMovementViewSet,
    RecipeViewSet,
    StockCountViewSet,
    InventoryTransferViewSet,
    WasteRecordViewSet,
    FoodCostAnalyticsViewSet,
)

router = DefaultRouter()
router.register(r"items", InventoryItemViewSet, basename="inventory-items")
router.register(r"batches", InventoryBatchViewSet, basename="inventory-batches")
router.register(r"movements", StockMovementViewSet, basename="inventory-movements")
router.register(r"recipes", RecipeViewSet, basename="inventory-recipes")
router.register(r"stock-counts", StockCountViewSet, basename="inventory-stock-counts")
router.register(r"transfers", InventoryTransferViewSet, basename="inventory-transfers")
router.register(r"waste", WasteRecordViewSet, basename="inventory-waste")
router.register(r"analytics", FoodCostAnalyticsViewSet, basename="inventory-analytics")

urlpatterns = [
    path("", include(router.urls)),
]
