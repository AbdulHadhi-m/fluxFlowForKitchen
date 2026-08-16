from django.urls import path
from apps.audit.views import (
    AuditLogListView,
    AuditLogDetailView,
    AuditLogExportView,
)

urlpatterns = [
    path("", AuditLogListView.as_view(), name="audit_log_list"),
    path("export/", AuditLogExportView.as_view(), name="audit_log_export"),
    path("<uuid:log_id>/", AuditLogDetailView.as_view(), name="audit_log_detail"),
]
