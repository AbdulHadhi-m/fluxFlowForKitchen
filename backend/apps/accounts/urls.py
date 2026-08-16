from django.urls import path
from apps.accounts.views import (
    LoginView,
    TokenRefreshView,
    LogoutView,
    CurrentUserView,
    UserSessionListView,
    TerminateSessionView,
    TerminateOtherSessionsView,
    ForgotPasswordView,
    ResetPasswordView,
)
from apps.rbac.views import SwitchActiveRoleView, AuthContextView

urlpatterns = [
    path("login/", LoginView.as_view(), name="auth_login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth_refresh"),
    path("logout/", LogoutView.as_view(), name="auth_logout"),
    path("me/", CurrentUserView.as_view(), name="auth_me"),
    path("context/", AuthContextView.as_view(), name="auth_context"),
    path("switch-role/", SwitchActiveRoleView.as_view(), name="auth_switch_role"),
    path("sessions/", UserSessionListView.as_view(), name="auth_sessions"),
    path("sessions/<uuid:session_id>/", TerminateSessionView.as_view(), name="auth_terminate_session"),
    path("sessions/other/", TerminateOtherSessionsView.as_view(), name="auth_terminate_other_sessions"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="auth_forgot_password"),
    path("reset-password/", ResetPasswordView.as_view(), name="auth_reset_password"),
]
