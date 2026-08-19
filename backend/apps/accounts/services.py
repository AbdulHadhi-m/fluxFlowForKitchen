import secrets
import uuid
from datetime import timedelta
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
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

            # Record security event for failed login
            cls._record_security_event(
                "AUTH_LOGIN_FAILED", f"Failed login for {email}",
                "MEDIUM", user=user, ip=ip_address, ua=user_agent,
                meta={"reason": "invalid_credentials"},
            )
            cls._record_login_attempt(
                email, False, user, ip_address, user_agent, "invalid_credentials"
            )

            if user.is_locked_out():
                cls._record_security_event(
                    "ACCOUNT_LOCKED", f"Account locked for {email} after failed attempts",
                    "HIGH", user=user, ip=ip_address, ua=user_agent,
                )
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

        # Record security event for successful login
        cls._record_security_event(
            "AUTH_LOGIN_SUCCESS", f"Successful login for {user.email}",
            "LOW", user=user, ip=ip_address, ua=user_agent,
        )
        cls._record_login_attempt(email, True, user, ip_address, user_agent)

        return user, session, access_token, refresh_token

    @classmethod
    def register_user_and_create_session(cls, first_name: str, last_name: str, email: str, password: str, restaurant_name: str = "My Kitchen Bistro", ip_address: str = None, user_agent: str = ""):
        import re
        from apps.restaurants.models import Restaurant
        from apps.rbac.models import Role, TenantMembership
        from apps.rbac.services import RBACService
        from apps.staff.models import StaffProfile

        email = email.strip().lower()
        if User.objects.filter(email=email).exists():
            raise ValidationError({"email": ["User already exists with this email."]})

        # Ensure system roles are seeded
        RBACService.seed_system_roles_and_permissions()

        # Create user
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            is_active=True,
        )

        # Create or assign default restaurant
        clean_name = restaurant_name.strip() if restaurant_name and restaurant_name.strip() else f"{first_name}'s Kitchen"
        base_slug = re.sub(r'[^a-zA-Z0-9]+', '-', clean_name.lower()).strip('-') or "my-kitchen"
        unique_slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

        restaurant = Restaurant.objects.create(
            slug=unique_slug,
            name=clean_name,
            legal_name=clean_name,
            email=email,
            is_active=True,
            currency="INR",
        )

        # Assign RESTAURANT_ADMIN role
        admin_role = Role.objects.filter(code="RESTAURANT_ADMIN").first()
        if not admin_role:
            admin_role = Role.objects.first()

        membership = TenantMembership.objects.create(
            user=user,
            tenant_id=restaurant.id,
            active_role=admin_role,
            is_active=True,
        )
        if admin_role:
            membership.assigned_roles.add(admin_role)

        # Create Staff profile
        emp_id = f"EMP-{uuid.uuid4().hex[:4].upper()}"
        StaffProfile.objects.create(
            restaurant=restaurant,
            user=user,
            membership=membership,
            employee_id=emp_id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            primary_role=admin_role,
            status=StaffProfile.StaffStatus.ACTIVE,
        )

        # Generate Session and Tokens
        session_id = uuid.uuid4()
        jwt_refresh = RefreshToken.for_user(user)
        jwt_refresh["session_id"] = str(session_id)
        refresh_token = str(jwt_refresh)
        access_token = str(jwt_refresh.access_token)
        session_expires_at = timezone.now() + timedelta(days=7)

        device_info = "Desktop Browser"
        if "Mobile" in user_agent:
            device_info = "Mobile Device"
        elif "Tablet" in user_agent:
            device_info = "Tablet Device"

        session = UserSession.objects.create(
            id=session_id,
            user=user,
            refresh_token_hash=UserSession.hash_token(refresh_token),
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else "",
            device_info=device_info,
            expires_at=session_expires_at,
        )

        cls._record_security_event(
            "AUTH_REGISTER_SUCCESS", f"Registered new user {user.email}",
            "LOW", user=user, ip=ip_address, ua=user_agent,
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

        # Validate against Django password validators
        try:
            validate_password(new_password, user)
        except DjangoValidationError as e:
            raise ValidationError({"password": list(e.messages)})

        user.set_password(new_password)
        user.save(update_fields=["password"])

        # Mark token consumed
        reset_token.mark_as_used()

        # Security: Revoke all existing sessions upon password reset
        UserSession.objects.filter(user=user, is_revoked=False).update(is_revoked=True)

        # Record security event
        cls._record_security_event(
            "PASSWORD_RESET_COMPLETED", f"Password reset completed for {user.email}",
            "MEDIUM", user=user,
        )

        return user

    # --- Internal Security Event Helpers ---

    @classmethod
    def _record_security_event(
        cls, event_type, description, severity,
        user=None, ip="", ua="", meta=None,
    ):
        """Record a security event without importing at module level to avoid circular imports."""
        try:
            from apps.security.services import SecurityEventService
            SecurityEventService.record(
                event_type=event_type,
                description=description,
                severity=severity,
                user=user,
                metadata=meta or {},
            )
        except Exception:
            pass  # Don't block auth flow if security event recording fails

    @classmethod
    def _record_login_attempt(
        cls, email, success, user=None, ip="", ua="", reason="",
    ):
        """Record a login attempt for suspicious activity detection."""
        try:
            from apps.security.services import LoginAttemptService
            LoginAttemptService.record_attempt(
                email=email, success=success, user=user,
                ip_address=ip, user_agent=ua, failure_reason=reason,
            )
        except Exception:
            pass  # Don't block auth flow
