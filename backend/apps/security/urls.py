from django.urls import path

from apps.security.views import (
    AccessReviewView,
    AdminSessionControlView,
    ChangePasswordView,
    DataRetentionPolicyView,
    MFADisableView,
    MFASetupView,
    MFAStatusView,
    MFAVerifyView,
    SecurityDashboardView,
    SecurityEventListView,
    SecurityIncidentDetailView,
    SecurityIncidentListView,
    SecurityPolicyView,
    StepUpAuthView,
)

urlpatterns = [
    # Dashboard
    path("dashboard/", SecurityDashboardView.as_view(), name="security_dashboard"),

    # Security Events
    path("events/", SecurityEventListView.as_view(), name="security_events"),

    # MFA
    path("mfa/status/", MFAStatusView.as_view(), name="mfa_status"),
    path("mfa/setup/", MFASetupView.as_view(), name="mfa_setup"),
    path("mfa/verify/", MFAVerifyView.as_view(), name="mfa_verify"),
    path("mfa/disable/", MFADisableView.as_view(), name="mfa_disable"),

    # Password
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("step-up-auth/", StepUpAuthView.as_view(), name="step_up_auth"),

    # Policy
    path("policy/", SecurityPolicyView.as_view(), name="security_policy"),

    # Incidents
    path("incidents/", SecurityIncidentListView.as_view(), name="security_incidents"),
    path("incidents/<uuid:incident_id>/", SecurityIncidentDetailView.as_view(), name="security_incident_detail"),

    # Admin Session Control
    path("admin/sessions/<uuid:user_id>/revoke/", AdminSessionControlView.as_view(), name="admin_session_revoke"),

    # Access Review
    path("access-review/", AccessReviewView.as_view(), name="access_review"),

    # Data Retention
    path("retention/", DataRetentionPolicyView.as_view(), name="data_retention"),
]
