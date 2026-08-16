"""Root URL configuration for Fluxiflow for Kitchen."""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/rbac/", include("apps.rbac.urls")),
    path("api/v1/restaurants/", include("apps.restaurants.urls")),
    path("api/v1/staff/", include("apps.staff.urls")),
    # OpenAPI 3 Schema & Swagger UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
