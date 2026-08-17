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
    path("api/v1/menu/", include("apps.menu.urls")),
    path("api/v1/tables/", include("apps.tables.urls")),
    path("api/v1/orders/", include("apps.orders.urls")),
    path("api/v1/kitchen/", include("apps.kitchen.urls")),
    path("api/v1/billing/", include("apps.billing.urls")),
    path("api/v1/inventory/", include("apps.inventory.urls")),
    path("api/v1/procurement/", include("apps.procurement.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/audit-logs/", include("apps.audit.urls")),
    path("api/v1/settings/", include("apps.settings.urls")),
    path("api/v1/", include("apps.customers.urls")),
    path("api/v1/", include("apps.loyalty.urls")),
    path("api/v1/marketing/", include("apps.marketing.urls")),
    # OpenAPI 3 Schema & Swagger UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
