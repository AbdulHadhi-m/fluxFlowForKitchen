from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.core.throttling import PublicAuthThrottle
from apps.accounts.models import UserSession
from apps.accounts.services import AuthService
from apps.accounts.serializers import (
    UserSerializer,
    LoginSerializer,
    TokenRefreshSerializer,
    UserSessionSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

COOKIE_NAME = "fluxiflow_refresh"
COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days

def set_refresh_cookie(response, refresh_token: str):
    """Set secure HttpOnly cookie for refresh token."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=refresh_token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path="/api/v1/auth/",
    )

def clear_refresh_cookie(response):
    """Clear refresh cookie upon logout."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/api/v1/auth/",
    )

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicAuthThrottle]

    @extend_schema(
        summary="User Authentication Login",
        request=LoginSerializer,
        responses={200: OpenApiResponse(description="Login successful, tokens returned")},
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        ip_address = request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        user, session, access_token, refresh_token = AuthService.authenticate_and_create_session(
            email=email,
            password=password,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        response = Response(
            {
                "success": True,
                "data": {
                    "user": UserSerializer(user).data,
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "session_id": str(session.id),
                },
            },
            status=status.HTTP_200_OK,
        )
        set_refresh_cookie(response, refresh_token)
        return response

class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Rotate and Refresh JWT Tokens",
        request=TokenRefreshSerializer,
        responses={200: OpenApiResponse(description="Token rotated successfully")},
    )
    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Read refresh token: explicit request payload takes precedence, then cookie fallback
        raw_refresh = serializer.validated_data.get("refresh_token") or request.COOKIES.get(COOKIE_NAME)

        if not raw_refresh:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "MISSING_REFRESH_TOKEN",
                        "message": "Refresh token must be provided in cookie or request body.",
                        "status_code": status.HTTP_400_BAD_REQUEST,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        ip_address = request.META.get("REMOTE_ADDR")
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        user, session, new_access, new_refresh = AuthService.rotate_refresh_token(
            raw_refresh_token=raw_refresh,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        response = Response(
            {
                "success": True,
                "data": {
                    "user": UserSerializer(user).data,
                    "access_token": new_access,
                    "refresh_token": new_refresh,
                    "session_id": str(session.id),
                },
            },
            status=status.HTTP_200_OK,
        )
        set_refresh_cookie(response, new_refresh)
        return response

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Logout and Revoke Current Session")
    def post(self, request):
        session_id = getattr(request.auth, "get", lambda k: None)("session_id")
        if session_id:
            AuthService.revoke_session(session_id, request.user)

        response = Response(
            {"success": True, "data": {"message": "Logged out successfully."}},
            status=status.HTTP_200_OK,
        )
        clear_refresh_cookie(response)
        return response

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Get Current Authenticated User Profile")
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

class UserSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="List Active User Sessions")
    def get(self, request):
        sessions = UserSession.objects.filter(
            user=request.user,
            is_revoked=False,
            expires_at__gt=timezone.now()
        )
        serializer = UserSessionSerializer(sessions, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

class TerminateSessionView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Terminate a Specific Session")
    def delete(self, request, session_id):
        revoked = AuthService.revoke_session(session_id, request.user)
        if not revoked:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "SESSION_NOT_FOUND",
                        "message": "Session not found or already revoked.",
                        "status_code": status.HTTP_404_NOT_FOUND,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {"success": True, "data": {"message": "Session terminated successfully."}},
            status=status.HTTP_200_OK,
        )

class TerminateOtherSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Terminate All Other Sessions")
    def delete(self, request):
        current_session_id = getattr(request.auth, "get", lambda k: None)("session_id")
        AuthService.revoke_all_other_sessions(current_session_id, request.user)
        return Response(
            {"success": True, "data": {"message": "All other sessions terminated."}},
            status=status.HTTP_200_OK,
        )

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicAuthThrottle]

    @extend_schema(summary="Request Password Reset Email")
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        reset_url = serializer.validated_data.get("reset_url", "http://localhost:5173/reset-password")

        AuthService.request_password_reset(email, reset_url)

        return Response(
            {
                "success": True,
                "data": {
                    "message": "If an account exists with this email, password reset instructions have been dispatched."
                },
            },
            status=status.HTTP_200_OK,
        )

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicAuthThrottle]

    @extend_schema(summary="Reset Password with Token")
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        AuthService.reset_password(token, password)

        return Response(
            {
                "success": True,
                "data": {
                    "message": "Password reset successfully. You may now log in with your new credentials."
                },
            },
            status=status.HTTP_200_OK,
        )
