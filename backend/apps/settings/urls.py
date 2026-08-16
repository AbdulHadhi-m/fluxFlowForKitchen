from django.urls import path
from apps.settings.views import (
    RestaurantProfileSettingsView,
    OperationalSettingsView,
    UserPreferencesView,
)

urlpatterns = [
    path("restaurant/", RestaurantProfileSettingsView.as_view(), name="settings_restaurant_profile"),
    path("operational/", OperationalSettingsView.as_view(), name="settings_operational"),
    path("preferences/", UserPreferencesView.as_view(), name="settings_user_preferences"),
]
