from django.urls import path
from apps.restaurants.views import (
    CurrentRestaurantView,
    RestaurantCreateView,
    BusinessHoursView,
)

urlpatterns = [
    path("", RestaurantCreateView.as_view(), name="restaurant_create"),
    path("current/", CurrentRestaurantView.as_view(), name="restaurant_current"),
    path("current/hours/", BusinessHoursView.as_view(), name="restaurant_hours"),
]
