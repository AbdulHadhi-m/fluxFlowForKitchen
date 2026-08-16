import secrets
import uuid
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, ValidationError, NotFound
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import User, UserSession, PasswordResetToken
from apps.accounts.tasks import send_password_reset_email

class AuthService:
    """
    Centralized Domain Service for Authentication and Session Security.
    """

    @classmethod
    def authenticate_and_create_session(cls, email: str, password: str, ip_address: str = None, user_agent: str = ""):
        email = email.strip().lower()
        user = User.objects.filter(email=email).first()

        if not user:
            raise AuthenticationFailed("Invalid email or password.", code="invalid_credentials")

        if not user.is_active:
            raise AuthenticationFailed("This account has been deactivated.", code="account_inactive")

        if user.is_locked_out():
            remaining_mins = int((user.locked_until - timezone.now()).total_seconds() / 60) + 1
            raise AuthenticationFailed(
                f"Account is temporarily locked due to multiple failed login attempts. Please try again in {remaining_mins} minutes.",
                code="account_locked"
            )

        if not user.check_password(password):
            user.register_failed_login(max_attempts=5, lockout_minutes=15)
            if user.is_locked_out():
                raise AuthenticationFailed(
                    "Account locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.",
                    code="account_locked"
                )
            raise AuthenticationFailed("Invalid email or password.", code="invalid_credentials")

        # Success: reset failed logins & update last_login
        user.reset_failed_logins()
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        # Generate session_id and assign to token claims before hashing
        session_id = uuid.uuid4()
        jwt_refresh = RefreshToken.for_user(user)
        jwt_refresh["session_id"] = str(session_id)
        refresh_token = str(jwt_refresh)
        access_token = str(jwt_refresh.access_token)

        session_expires_at = timezone.now() + timedelta(days=7)

        # Parse basic device info from user agent
        device_info = "Desktop Browser"
        if "Mobile" in user_agent:
            device_info = "Mobile Device"
        elif "Tablet" in user_agent:
            device_info = "Tablet Device"

        # Create session record
        session = UserSession.objects.create(
            id=session_id,
            user=user,
            refresh_token_hash=UserSession.hash_token(refresh_token),
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else "",
            device_info=device_info,
            expires_at=session_expires_at,
        )

        return user, session, access_token, refresh_token

    @classmethod
    def rotate_refresh_token(cls, raw_refresh_token: str, ip_address: str = None, user_agent: str = ""):
        token_hash = UserSession.hash_token(raw_refresh_token)
        session = UserSession.objects.filter(refresh_token_hash=token_hash).select_related("user").first()

        if not session or not session.is_valid():
            raise AuthenticationFailed("Invalid, expired, or revoked refresh token.", code="invalid_token")

        user = session.user
        if not user.is_active or user.is_locked_out():
            raise AuthenticationFailed("User account is inactive or locked.", code="account_disabled")

        # Rotate token
        new_jwt_refresh = RefreshToken.for_user(user)
        new_jwt_refresh["session_id"] = str(session.id)
        new_refresh_str = str(new_jwt_refresh)
        new_access_str = str(new_jwt_refresh.access_token)

        # Update session with new hash and touch last_activity
        session.refresh_token_hash = UserSession.hash_token(new_refresh_str)
        session.last_activity = timezone.now()
        if ip_address:
            session.ip_address = ip_address
        session.save(update_fields=["refresh_token_hash", "last_activity", "ip_address"])

        return user, session, new_access_str, new_refresh_str

    @classmethod
    def revoke_session(cls, session_id: str, user: User):
        session = UserSession.objects.filter(id=session_id, user=user).first()
        if session:
            session.revoke()
            return True
        return False

    @classmethod
    def revoke_all_other_sessions(cls, current_session_id: str, user: User):
        UserSession.objects.filter(user=user, is_revoked=False).exclude(id=current_session_id).update(is_revoked=True)

    @classmethod
    def request_password_reset(cls, email: str, reset_base_url: str):
        email = email.strip().lower()
        user = User.objects.filter(email=email, is_active=True).first()

        if user:
            # Generate cryptographically secure token
            raw_token = secrets.token_urlsafe(32)
            token_hash = PasswordResetToken.hash_token(raw_token)
            expires_at = timezone.now() + timedelta(minutes=15)

            # Invalidate any previous unused reset tokens for this user
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

            PasswordResetToken.objects.create(
                user=user,
                token_hash=token_hash,
                expires_at=expires_at,
            )

            # Queue asynchronous Celery email task
            send_password_reset_email.delay(user.email, raw_token, reset_base_url)

        # Always return True for anti-enumeration security
        return True

    @classmethod
    def reset_password(cls, raw_token: str, new_password: str):
        token_hash = PasswordResetToken.hash_token(raw_token)
        reset_token = PasswordResetToken.objects.filter(token_hash=token_hash).select_related("user").first()

        if not reset_token or not reset_token.is_valid():
            raise ValidationError({"token": ["Invalid, expired, or already used reset token."]})

        user = reset_token.user
        user.set_password(new_password)
        user.save(update_fields=["password"])

        # Mark token consumed
        reset_token.mark_as_used()

        # Security: Revoke all existing sessions upon password reset
        UserSession.objects.filter(user=user, is_revoked=False).update(is_revoked=True)

        return user
