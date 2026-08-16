from django.urls import path
from apps.inventory.views import (
    InventoryItemListCreateView,
    InventoryItemDetailView,
    InventoryItemReceiveView,
    InventoryItemAdjustView,
    InventoryItemWastageView,
    StockMovementListView,
    RecipeListCreateView,
)

urlpatterns = [
    path("items/", InventoryItemListCreateView.as_view(), name="inventory_item_list_create"),
    path("items/<uuid:item_id>/", InventoryItemDetailView.as_view(), name="inventory_item_detail"),
    path("items/<uuid:item_id>/receive/", InventoryItemReceiveView.as_view(), name="inventory_item_receive"),
    path("items/<uuid:item_id>/adjust/", InventoryItemAdjustView.as_view(), name="inventory_item_adjust"),
    path("items/<uuid:item_id>/waste/", InventoryItemWastageView.as_view(), name="inventory_item_waste"),
    path("movements/", StockMovementListView.as_view(), name="stock_movement_list"),
    path("recipes/", RecipeListCreateView.as_view(), name="recipe_list_create"),
]
