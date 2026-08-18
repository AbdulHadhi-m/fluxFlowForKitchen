from django.urls import path

from apps.monitoring.views import (
    MonitoringErrorsDetailView,
    MonitoringErrorsListView,
    MonitoringHealthView,
    MonitoringMetricsView,
    MonitoringOverviewView,
)
from apps.monitoring.views_system import (
    MonitoringAlertRulesDetailView,
    MonitoringAlertRulesView,
    MonitoringAlertsDetailView,
    MonitoringAlertsListView,
    MonitoringConfigView,
    MonitoringDatabaseView,
    MonitoringIncidentsDetailView,
    MonitoringIncidentsListView,
    MonitoringIntegrationsView,
    MonitoringJobsView,
    MonitoringNotificationsView,
    MonitoringSLODetailView,
    MonitoringSLOListView,
    MonitoringWorkflowsView,
)

urlpatterns = [
    path("overview/", MonitoringOverviewView.as_view(), name="monitoring_overview"),
    path("errors/", MonitoringErrorsListView.as_view(), name="monitoring_errors"),
    path("errors/<uuid:error_id>/", MonitoringErrorsDetailView.as_view(), name="monitoring_error_detail"),
    path("metrics/", MonitoringMetricsView.as_view(), name="monitoring_metrics"),
    path("health/", MonitoringHealthView.as_view(), name="monitoring_health"),
    path("jobs/", MonitoringJobsView.as_view(), name="monitoring_jobs"),
    path("workflows/", MonitoringWorkflowsView.as_view(), name="monitoring_workflows"),
    path("notifications/", MonitoringNotificationsView.as_view(), name="monitoring_notifications"),
    path("integrations/", MonitoringIntegrationsView.as_view(), name="monitoring_integrations"),
    path("database/", MonitoringDatabaseView.as_view(), name="monitoring_database"),
    path("alerts/", MonitoringAlertsListView.as_view(), name="monitoring_alerts"),
    path("alerts/<uuid:alert_id>/<str:action>/", MonitoringAlertsDetailView.as_view(), name="monitoring_alert_action"),
    path("alert-rules/", MonitoringAlertRulesView.as_view(), name="monitoring_alert_rules"),
    path("alert-rules/<uuid:rule_id>/", MonitoringAlertRulesDetailView.as_view(), name="monitoring_alert_rule_detail"),
    path("alert-rules/<uuid:rule_id>/toggle/", MonitoringAlertRulesDetailView.as_view(), name="monitoring_alert_rule_toggle"),
    path("incidents/", MonitoringIncidentsListView.as_view(), name="monitoring_incidents"),
    path(
        "incidents/<uuid:incident_id>/<str:action>/",
        MonitoringIncidentsDetailView.as_view(),
        name="monitoring_incident_action",
    ),
    path("slos/", MonitoringSLOListView.as_view(), name="monitoring_slos"),
    path("slos/<uuid:slo_id>/", MonitoringSLODetailView.as_view(), name="monitoring_slo_detail"),
    path("slos/<uuid:slo_id>/evaluate/", MonitoringSLODetailView.as_view(), name="monitoring_slo_evaluate"),
    path("config/", MonitoringConfigView.as_view(), name="monitoring_config"),
]