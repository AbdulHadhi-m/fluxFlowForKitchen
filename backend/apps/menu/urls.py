from django.urls import path
from apps.menu.views import (
    CategoryListCreateView,
    CategoryDetailUpdateView,
    MenuItemListCreateView,
    MenuItemDetailUpdateView,
    MenuItemAvailabilityView,
)

urlpatterns = [
    # Categories
    path("categories/", CategoryListCreateView.as_view(), name="menu_category_list_create"),
    path("categories/<uuid:category_id>/", CategoryDetailUpdateView.as_view(), name="menu_category_detail"),
    
    # Items
    path("items/", MenuItemListCreateView.as_view(), name="menu_item_list_create"),
    path("items/<uuid:item_id>/", MenuItemDetailUpdateView.as_view(), name="menu_item_detail"),
    path("items/<uuid:item_id>/availability/", MenuItemAvailabilityView.as_view(), name="menu_item_availability"),
]
