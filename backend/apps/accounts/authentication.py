import uuid
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from apps.accounts.models import UserSession

class SessionValidatingJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication class that validates the JWT access token and
    asserts that the associated UserSession is active and not revoked.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        if not user.is_active:
            raise AuthenticationFailed("User account is inactive.", code="user_inactive")

        if user.is_locked_out():
            raise AuthenticationFailed("User account is temporarily locked.", code="user_locked")

        # Optional session revocation check if session_id is embedded in token
        session_id = validated_token.get("session_id")
        if session_id:
            try:
                session = UserSession.objects.filter(id=session_id, user=user).first()
                if not session or not session.is_valid():
                    raise InvalidToken("Session has been revoked or expired.")
            except Exception:
                raise InvalidToken("Invalid session reference in token.")

        return user
