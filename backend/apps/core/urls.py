from django.urls import path
from .views import DependenciesView, HealthCheckView, LivenessView, ReadinessView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health_check"),
    path("health/live/", LivenessView.as_view(), name="health_live"),
    path("health/ready/", ReadinessView.as_view(), name="health_ready"),
    path("health/dependencies/", DependenciesView.as_view(), name="health_dependencies"),
]