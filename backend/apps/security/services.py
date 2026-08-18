import hashlib
import ipaddress
import logging
import os
import re
import secrets
import uuid
from datetime import timedelta
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.accounts.models import User, UserSession
from apps.audit.models import AuditAction, AuditActorType, AuditEntityType
from apps.audit.services import AuditLogService
from apps.audit.utils import RequestContextHelper
from apps.security.models import (
    DataRetentionPolicy,
    IncidentSeverity,
    IncidentStatus,
    LoginAttemptLog,
    MFADevice,
    MFARecoveryCode,
    SecurityEvent,
    SecurityEventSeverity,
    SecurityEventType,
    SecurityIncident,
    SecurityPolicy,
)

logger = logging.getLogger("fluxiflow.security")


# ---------------------------------------------------------------------------
# Security Event Service
# ---------------------------------------------------------------------------
class SecurityEventService:
    """Records security events. Integrates with existing AuditLogService."""

    @classmethod
    def record(
        cls,
        event_type: str,
        description: str = "",
        severity: str = SecurityEventSeverity.LOW,
        user: Optional[User] = None,
        restaurant=None,
        request=None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SecurityEvent:
        ip_address = ""
        user_agent = ""
        correlation_id = ""

        if request:
            ip_address = RequestContextHelper.get_client_ip(request)
            user_agent = RequestContextHelper.get_user_agent(request)
            correlation_id = RequestContextHelper.get_correlation_id(request)
            if not user and hasattr(request, "user") and request.user.is_authenticated:
                user = request.user
            if not restaurant and hasattr(request, "restaurant"):
                restaurant = request.restaurant

        try:
            event = SecurityEvent.objects.create(
                restaurant=restaurant,
                user=user,
                event_type=event_type,
                severity=severity,
                description=description.strip(),
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else "",
                correlation_id=correlation_id,
                metadata=metadata or {},
            )
            return event
        except Exception as e:
            logger.error(f"Failed to record security event: {e}", exc_info=True)
            raise


# ---------------------------------------------------------------------------
# Login Attempt Tracking
# ---------------------------------------------------------------------------
class LoginAttemptService:
    """Tracks login attempts for suspicious activity detection."""

    @classmethod
    def record_attempt(
        cls,
        email: str,
        success: bool,
        user: Optional[User] = None,
        ip_address: str = "",
        user_agent: str = "",
        failure_reason: str = "",
    ) -> LoginAttemptLog:
        return LoginAttemptLog.objects.create(
            email=email.lower().strip(),
            user=user,
            success=success,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else "",
            failure_reason=failure_reason,
        )

    @classmethod
    def get_recent_failed_count(
        cls, email: str = "", ip_address: str = "", minutes: int = 30
    ) -> int:
        since = timezone.now() - timedelta(minutes=minutes)
        qs = LoginAttemptLog.objects.filter(success=False, created_at__gte=since)
        if email:
            qs = qs.filter(email=email.lower().strip())
        if ip_address:
            qs = qs.filter(ip_address=ip_address)
        return qs.count()


# ---------------------------------------------------------------------------
# MFA Service
# ---------------------------------------------------------------------------
class MFAService:
    """TOTP-based MFA management. Secrets encrypted with Fernet."""

    RECOVERY_CODE_COUNT = 10
    RECOVERY_CODE_LENGTH = 8

    @classmethod
    def _get_encryption_key(cls) -> bytes:
        key = getattr(settings, "MFA_ENCRYPTION_KEY", None) or os.environ.get("MFA_ENCRYPTION_KEY", "")
        if not key:
            # In development, use a derived key from SECRET_KEY (not for production)
            import base64
            derived = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
            return base64.urlsafe_b64encode(derived)
        return key.encode() if isinstance(key, str) else key

    @classmethod
    def _encrypt_secret(cls, secret: str) -> str:
        from cryptography.fernet import Fernet
        f = Fernet(cls._get_encryption_key())
        return f.encrypt(secret.encode()).decode()

    @classmethod
    def _decrypt_secret(cls, encrypted: str) -> str:
        from cryptography.fernet import Fernet
        f = Fernet(cls._get_encryption_key())
        return f.decrypt(encrypted.encode()).decode()

    @classmethod
    def setup_mfa(cls, user: User) -> Tuple[MFADevice, str, str]:
        """
        Initiates MFA setup. Returns (device, raw_secret, provisioning_uri).
        The raw_secret is shown once as a QR code.
        """
        import pyotp

        # Remove any existing unverified device
        MFADevice.objects.filter(user=user, is_verified=False).delete()

        raw_secret = pyotp.random_base32()
        encrypted = cls._encrypt_secret(raw_secret)

        device = MFADevice.objects.create(
            user=user,
            encrypted_secret=encrypted,
            is_verified=False,
            is_active=False,
        )

        totp = pyotp.TOTP(raw_secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name="Fluxiflow Kitchen",
        )

        return device, raw_secret, provisioning_uri

    @classmethod
    def verify_and_activate(cls, user: User, otp_code: str) -> Tuple[MFADevice, List[str]]:
        """
        Verifies the initial TOTP code and activates MFA.
        Returns the device and a list of plaintext recovery codes (shown once).
        """
        import pyotp

        device = MFADevice.objects.filter(user=user).first()
        if not device:
            raise ValidationError({"mfa": "No MFA device found. Please initiate setup first."})

        if device.is_active and device.is_verified:
            raise ValidationError({"mfa": "MFA is already active."})

        raw_secret = cls._decrypt_secret(device.encrypted_secret)
        totp = pyotp.TOTP(raw_secret)

        if not totp.verify(otp_code, valid_window=1):
            raise ValidationError({"otp_code": "Invalid verification code. Please try again."})

        # Activate device
        device.is_verified = True
        device.is_active = True
        device.verified_at = timezone.now()
        device.save(update_fields=["is_verified", "is_active", "verified_at"])

        # Generate recovery codes
        raw_codes = cls._generate_recovery_codes(device)

        return device, raw_codes

    @classmethod
    def verify_otp(cls, user: User, otp_code: str) -> bool:
        """Verify a TOTP code for an active MFA device."""
        import pyotp

        device = MFADevice.objects.filter(user=user, is_active=True, is_verified=True).first()
        if not device:
            return False

        raw_secret = cls._decrypt_secret(device.encrypted_secret)
        totp = pyotp.TOTP(raw_secret)

        if totp.verify(otp_code, valid_window=1):
            device.last_used_at = timezone.now()
            device.save(update_fields=["last_used_at"])
            return True

        return False

    @classmethod
    def verify_recovery_code(cls, user: User, recovery_code: str) -> bool:
        """Verify and consume a recovery code."""
        device = MFADevice.objects.filter(user=user, is_active=True).first()
        if not device:
            return False

        code_hash = MFARecoveryCode.hash_code(recovery_code.strip().upper())
        rc = MFARecoveryCode.objects.filter(
            device=device, code_hash=code_hash, is_used=False
        ).first()

        if not rc:
            return False

        rc.is_used = True
        rc.used_at = timezone.now()
        rc.save(update_fields=["is_used", "used_at"])
        return True

    @classmethod
    def disable_mfa(cls, user: User) -> bool:
        """Disable MFA for a user. Requires prior re-authentication."""
        device = MFADevice.objects.filter(user=user).first()
        if not device:
            return False

        MFARecoveryCode.objects.filter(device=device).delete()
        device.delete()
        return True

    @classmethod
    def _generate_recovery_codes(cls, device: MFADevice) -> List[str]:
        """Generate and store hashed recovery codes. Returns plaintext codes."""
        # Delete old codes
        MFARecoveryCode.objects.filter(device=device).delete()

        raw_codes = []
        for _ in range(cls.RECOVERY_CODE_COUNT):
            code = secrets.token_hex(cls.RECOVERY_CODE_LENGTH // 2).upper()
            raw_codes.append(code)
            MFARecoveryCode.objects.create(
                device=device,
                code_hash=MFARecoveryCode.hash_code(code),
            )

        return raw_codes

    @classmethod
    def user_has_mfa(cls, user: User) -> bool:
        return MFADevice.objects.filter(user=user, is_active=True, is_verified=True).exists()

    @classmethod
    def get_remaining_recovery_codes(cls, user: User) -> int:
        device = MFADevice.objects.filter(user=user, is_active=True).first()
        if not device:
            return 0
        return MFARecoveryCode.objects.filter(device=device, is_used=False).count()


# ---------------------------------------------------------------------------
# Suspicious Activity Detector
# ---------------------------------------------------------------------------
class SuspiciousActivityDetector:
    """Rule-based deterministic suspicious activity detection."""

    @classmethod
    def check_login_anomalies(cls, restaurant=None, minutes: int = 30) -> List[Dict]:
        """Detect accounts/IPs with excessive failed logins."""
        since = timezone.now() - timedelta(minutes=minutes)
        alerts = []

        # Check by email
        email_failures = (
            LoginAttemptLog.objects.filter(
                success=False, created_at__gte=since
            )
            .values("email")
            .annotate(count=Count("id"))
            .filter(count__gte=5)
        )
        for entry in email_failures:
            alerts.append({
                "rule": "EXCESSIVE_FAILED_LOGINS_EMAIL",
                "email": entry["email"],
                "count": entry["count"],
                "window_minutes": minutes,
            })

        # Check by IP
        ip_failures = (
            LoginAttemptLog.objects.filter(
                success=False, created_at__gte=since
            )
            .values("ip_address")
            .annotate(count=Count("id"))
            .filter(count__gte=10)
            .exclude(ip_address="")
        )
        for entry in ip_failures:
            alerts.append({
                "rule": "EXCESSIVE_FAILED_LOGINS_IP",
                "ip_address": entry["ip_address"],
                "count": entry["count"],
                "window_minutes": minutes,
            })

        return alerts

    @classmethod
    def check_permission_denial_spikes(cls, restaurant=None, minutes: int = 60) -> List[Dict]:
        """Detect users getting many permission denials (potential privilege probing)."""
        since = timezone.now() - timedelta(minutes=minutes)
        alerts = []

        qs = SecurityEvent.objects.filter(
            event_type=SecurityEventType.PERMISSION_DENIED,
            created_at__gte=since,
        )
        if restaurant:
            qs = qs.filter(restaurant=restaurant)

        user_denials = (
            qs.values("user__email", "user_id")
            .annotate(count=Count("id"))
            .filter(count__gte=10)
        )
        for entry in user_denials:
            alerts.append({
                "rule": "EXCESSIVE_PERMISSION_DENIALS",
                "email": entry["user__email"],
                "user_id": str(entry["user_id"]),
                "count": entry["count"],
                "window_minutes": minutes,
            })

        return alerts

    @classmethod
    def run_all_checks(cls, restaurant=None) -> List[Dict]:
        alerts = []
        alerts.extend(cls.check_login_anomalies(restaurant))
        alerts.extend(cls.check_permission_denial_spikes(restaurant))
        return alerts


# ---------------------------------------------------------------------------
# Security Policy Service
# ---------------------------------------------------------------------------
class SecurityPolicyService:
    """Manages per-tenant security policies."""

    @classmethod
    def get_or_create_policy(cls, restaurant) -> SecurityPolicy:
        policy, _ = SecurityPolicy.objects.get_or_create(restaurant=restaurant)
        return policy

    @classmethod
    def validate_password_against_policy(cls, password: str, restaurant=None) -> List[str]:
        """Validate a password against the tenant's security policy."""
        errors = []

        if restaurant:
            try:
                policy = SecurityPolicy.objects.get(restaurant=restaurant)
            except SecurityPolicy.DoesNotExist:
                policy = None
        else:
            policy = None

        min_length = policy.password_min_length if policy else 8
        if len(password) < min_length:
            errors.append(f"Password must be at least {min_length} characters long.")

        if policy and policy.password_require_uppercase:
            if not re.search(r"[A-Z]", password):
                errors.append("Password must contain at least one uppercase letter.")

        if policy and policy.password_require_number:
            if not re.search(r"\d", password):
                errors.append("Password must contain at least one digit.")

        if policy and policy.password_require_special:
            if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
                errors.append("Password must contain at least one special character.")

        return errors


# ---------------------------------------------------------------------------
# Security Incident Service
# ---------------------------------------------------------------------------
class SecurityIncidentService:
    """Manages security incident lifecycle."""

    @classmethod
    def create_incident(
        cls,
        restaurant,
        title: str,
        description: str = "",
        severity: str = IncidentSeverity.MEDIUM,
        reported_by: Optional[User] = None,
        affected_user: Optional[User] = None,
        related_event_ids: Optional[List] = None,
    ) -> SecurityIncident:
        incident = SecurityIncident.objects.create(
            restaurant=restaurant,
            title=title,
            description=description,
            severity=severity,
            status=IncidentStatus.OPEN,
            reported_by=reported_by,
            affected_user=affected_user,
        )
        if related_event_ids:
            events = SecurityEvent.objects.filter(id__in=related_event_ids)
            incident.related_events.set(events)

        return incident

    @classmethod
    def update_status(
        cls,
        incident: SecurityIncident,
        new_status: str,
        user: User,
        note: str = "",
    ) -> SecurityIncident:
        old_status = incident.status
        incident.status = new_status

        if new_status in (IncidentStatus.RESOLVED, IncidentStatus.CLOSED):
            incident.resolved_at = timezone.now()

        if note:
            notes = incident.notes or []
            notes.append({
                "timestamp": timezone.now().isoformat(),
                "author": user.email,
                "text": note,
                "status_change": f"{old_status} → {new_status}",
            })
            incident.notes = notes

        incident.save()
        return incident

    @classmethod
    def add_note(cls, incident: SecurityIncident, user: User, text: str) -> SecurityIncident:
        notes = incident.notes or []
        notes.append({
            "timestamp": timezone.now().isoformat(),
            "author": user.email,
            "text": text,
        })
        incident.notes = notes
        incident.save(update_fields=["notes", "updated_at"])
        return incident


# ---------------------------------------------------------------------------
# Step-Up Authentication Service
# ---------------------------------------------------------------------------
class StepUpAuthService:
    """Verifies recent authentication for sensitive operations."""

    STEP_UP_WINDOW_MINUTES = 15

    @classmethod
    def has_recent_auth(cls, user: User, window_minutes: int = None) -> bool:
        """Check if user has authenticated recently enough for sensitive operations."""
        window = window_minutes or cls.STEP_UP_WINDOW_MINUTES
        threshold = timezone.now() - timedelta(minutes=window)

        # Check last login
        if user.last_login and user.last_login >= threshold:
            return True

        # Check last step-up auth event
        recent_step_up = SecurityEvent.objects.filter(
            user=user,
            event_type=SecurityEventType.STEP_UP_AUTH,
            created_at__gte=threshold,
        ).exists()

        return recent_step_up

    @classmethod
    def record_step_up(cls, user: User, request=None) -> SecurityEvent:
        return SecurityEventService.record(
            event_type=SecurityEventType.STEP_UP_AUTH,
            description=f"Step-up authentication completed for {user.email}",
            severity=SecurityEventSeverity.LOW,
            user=user,
            request=request,
        )


# ---------------------------------------------------------------------------
# PII Masking Service
# ---------------------------------------------------------------------------
class PIIMaskingService:
    """Masks PII fields for display in non-privileged contexts."""

    @classmethod
    def mask_email(cls, email: str) -> str:
        if not email or "@" not in email:
            return "***"
        local, domain = email.split("@", 1)
        if len(local) <= 2:
            masked_local = local[0] + "***"
        else:
            masked_local = local[0] + "***" + local[-1]
        return f"{masked_local}@{domain}"

    @classmethod
    def mask_phone(cls, phone: str) -> str:
        if not phone:
            return "***"
        digits = re.sub(r"\D", "", phone)
        if len(digits) <= 4:
            return "***" + digits[-2:]
        return "***" + digits[-4:]

    @classmethod
    def mask_name(cls, name: str) -> str:
        if not name:
            return "***"
        parts = name.strip().split()
        masked = []
        for part in parts:
            if len(part) <= 1:
                masked.append(part)
            else:
                masked.append(part[0] + "***")
        return " ".join(masked)


# ---------------------------------------------------------------------------
# SSRF Validator
# ---------------------------------------------------------------------------
class SSRFValidator:
    """Validates URLs to prevent SSRF attacks in webhook/external URL features."""

    BLOCKED_SCHEMES = {"file", "ftp", "gopher", "data", "javascript"}

    @classmethod
    def is_safe_url(cls, url: str) -> Tuple[bool, str]:
        """Returns (is_safe, reason) tuple."""
        try:
            parsed = urlparse(url)
        except Exception:
            return False, "Invalid URL format"

        # Check scheme
        if parsed.scheme.lower() not in ("http", "https"):
            return False, f"Blocked protocol: {parsed.scheme}"

        if parsed.scheme.lower() in cls.BLOCKED_SCHEMES:
            return False, f"Blocked protocol: {parsed.scheme}"

        hostname = parsed.hostname
        if not hostname:
            return False, "Missing hostname"

        # Block private/loopback IPs
        try:
            addr = ipaddress.ip_address(hostname)
            if addr.is_private or addr.is_loopback or addr.is_reserved or addr.is_link_local:
                return False, "Blocked: private/loopback/reserved IP address"
        except ValueError:
            # hostname is not an IP, check for localhost
            if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
                return False, "Blocked: localhost"

            # Check for metadata endpoints
            if hostname.lower() in (
                "metadata.google.internal",
                "169.254.169.254",
            ):
                return False, "Blocked: cloud metadata endpoint"

        return True, "OK"


# ---------------------------------------------------------------------------
# File Upload Validator
# ---------------------------------------------------------------------------
class FileUploadValidator:
    """Validates file uploads for security."""

    ALLOWED_EXTENSIONS = {
        "image": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"},
        "document": {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"},
    }
    MAX_FILE_SIZE_MB = 10
    DANGEROUS_EXTENSIONS = {
        ".exe", ".bat", ".cmd", ".com", ".vbs", ".vbe",
        ".js", ".jse", ".wsf", ".wsh", ".ps1", ".psc1",
        ".scr", ".pif", ".msi", ".msp", ".mst",
        ".cpl", ".hta", ".inf", ".ins", ".isp",
        ".reg", ".rgs", ".sct", ".shb", ".shs",
        ".php", ".py", ".rb", ".sh", ".pl",
    }

    @classmethod
    def validate(
        cls,
        filename: str,
        file_size: int,
        content_type: str = "",
        category: str = "document",
    ) -> List[str]:
        errors = []

        # Filename security
        if not filename:
            errors.append("Filename is required.")
            return errors

        # Path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            errors.append("Invalid filename: path traversal detected.")

        # Extension check
        ext = os.path.splitext(filename)[1].lower()
        if ext in cls.DANGEROUS_EXTENSIONS:
            errors.append(f"File extension '{ext}' is not allowed.")

        allowed = cls.ALLOWED_EXTENSIONS.get(category, set())
        if allowed and ext not in allowed:
            errors.append(f"File extension '{ext}' is not allowed for {category} uploads.")

        # Size check
        max_bytes = cls.MAX_FILE_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            errors.append(f"File size exceeds maximum of {cls.MAX_FILE_SIZE_MB}MB.")

        # Filename length
        if len(filename) > 255:
            errors.append("Filename is too long (max 255 characters).")

        return errors

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Sanitize filename to prevent path traversal and injection."""
        # Remove path components
        filename = os.path.basename(filename)
        # Replace dangerous characters
        filename = re.sub(r"[^\w\s\-.]", "_", filename)
        # Ensure it has a safe extension
        if not filename:
            filename = f"{uuid.uuid4().hex[:12]}"
        return filename
