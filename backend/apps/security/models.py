import hashlib
import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.core.models import UUIDModel, TimeStampedModel


# ---------------------------------------------------------------------------
# Security Event Types
# ---------------------------------------------------------------------------
class SecurityEventType(models.TextChoices):
    AUTH_LOGIN_SUCCESS = "AUTH_LOGIN_SUCCESS", "Login Success"
    AUTH_LOGIN_FAILED = "AUTH_LOGIN_FAILED", "Login Failed"
    AUTH_LOGOUT = "AUTH_LOGOUT", "Logout"
    PASSWORD_CHANGED = "PASSWORD_CHANGED", "Password Changed"
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED", "Password Reset Requested"
    PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED", "Password Reset Completed"
    MFA_ENABLED = "MFA_ENABLED", "MFA Enabled"
    MFA_DISABLED = "MFA_DISABLED", "MFA Disabled"
    MFA_VERIFIED = "MFA_VERIFIED", "MFA Verified"
    MFA_FAILED = "MFA_FAILED", "MFA Verification Failed"
    SESSION_REVOKED = "SESSION_REVOKED", "Session Revoked"
    ALL_SESSIONS_REVOKED = "ALL_SESSIONS_REVOKED", "All Sessions Revoked"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED", "Account Locked"
    ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED", "Account Unlocked"
    ACCOUNT_DISABLED = "ACCOUNT_DISABLED", "Account Disabled"
    ACCOUNT_DELETED = "ACCOUNT_DELETED", "Account Deleted"
    PERMISSION_DENIED = "PERMISSION_DENIED", "Permission Denied"
    ROLE_CHANGED = "ROLE_CHANGED", "Role Changed"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY", "Suspicious Activity"
    SECURITY_SETTING_CHANGED = "SECURITY_SETTING_CHANGED", "Security Setting Changed"
    DATA_EXPORT = "DATA_EXPORT", "Sensitive Data Export"
    ADMIN_SESSION_REVOKE = "ADMIN_SESSION_REVOKE", "Admin Session Revocation"
    STEP_UP_AUTH = "STEP_UP_AUTH", "Step-Up Authentication"
    EMPLOYEE_OFFBOARDED = "EMPLOYEE_OFFBOARDED", "Employee Offboarded"


class SecurityEventSeverity(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical"


# ---------------------------------------------------------------------------
# Data Classification
# ---------------------------------------------------------------------------
class DataClassificationLevel(models.TextChoices):
    PUBLIC = "PUBLIC", "Public"
    INTERNAL = "INTERNAL", "Internal"
    CONFIDENTIAL = "CONFIDENTIAL", "Confidential"
    RESTRICTED = "RESTRICTED", "Restricted"


# ---------------------------------------------------------------------------
# Security Event
# ---------------------------------------------------------------------------
class SecurityEvent(UUIDModel):
    """
    Structured security event log. Extends the existing audit system with
    security-specific event types, severity, and detection metadata.
    Does NOT replace AuditLog — complements it for security operations.
    """
    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="security_events",
        help_text="Tenant context (null for platform-level events)"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="security_events",
        help_text="User involved in this event"
    )
    event_type = models.CharField(
        max_length=40,
        choices=SecurityEventType.choices,
        db_index=True,
    )
    severity = models.CharField(
        max_length=10,
        choices=SecurityEventSeverity.choices,
        default=SecurityEventSeverity.LOW,
        db_index=True,
    )
    description = models.TextField(
        blank=True,
        default="",
    )
    ip_address = models.CharField(max_length=45, blank=True, default="")
    user_agent = models.CharField(max_length=500, blank=True, default="")
    correlation_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Security Event"
        verbose_name_plural = "Security Events"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "created_at"]),
            models.Index(fields=["user", "event_type", "created_at"]),
            models.Index(fields=["event_type", "severity", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding and SecurityEvent.objects.filter(id=self.id).exists():
            raise ValidationError("Security events are append-only and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Security events are immutable and cannot be deleted.")

    def __str__(self):
        return f"[{self.created_at}] {self.event_type} - {self.description[:80]}"


# ---------------------------------------------------------------------------
# MFA Device (TOTP)
# ---------------------------------------------------------------------------
class MFADevice(UUIDModel, TimeStampedModel):
    """
    TOTP-based MFA device for a user.
    The secret is stored encrypted (encryption handled at the service layer).
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mfa_device",
    )
    encrypted_secret = models.CharField(
        max_length=255,
        help_text="Fernet-encrypted TOTP secret key"
    )
    is_verified = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether the device has been verified with an initial TOTP code"
    )
    is_active = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether MFA is actively enforced for this user"
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "MFA Device"
        verbose_name_plural = "MFA Devices"

    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"MFA ({status}) for {self.user.email}"


class MFARecoveryCode(UUIDModel):
    """
    One-time-use hashed recovery codes for MFA bypass.
    Codes are displayed exactly once at creation and stored as SHA-256 hashes.
    """
    device = models.ForeignKey(
        MFADevice,
        on_delete=models.CASCADE,
        related_name="recovery_codes",
    )
    code_hash = models.CharField(
        max_length=64,
        help_text="SHA-256 hash of the recovery code"
    )
    is_used = models.BooleanField(default=False, db_index=True)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "MFA Recovery Code"
        verbose_name_plural = "MFA Recovery Codes"

    @classmethod
    def hash_code(cls, raw_code: str) -> str:
        return hashlib.sha256(raw_code.encode("utf-8")).hexdigest()

    def __str__(self):
        status = "Used" if self.is_used else "Available"
        return f"Recovery code ({status}) for device {self.device_id}"


# ---------------------------------------------------------------------------
# Security Policy (per-tenant)
# ---------------------------------------------------------------------------
class SecurityPolicy(UUIDModel, TimeStampedModel):
    """
    Per-tenant configurable security policy. Centralizes password policy,
    MFA requirements, session policy, and lockout configuration.
    """
    restaurant = models.OneToOneField(
        "restaurants.Restaurant",
        on_delete=models.CASCADE,
        related_name="security_policy",
    )

    # Password Policy
    password_min_length = models.PositiveIntegerField(
        default=8,
        help_text="Minimum password length"
    )
    password_require_uppercase = models.BooleanField(
        default=False,
        help_text="Require at least one uppercase letter"
    )
    password_require_number = models.BooleanField(
        default=False,
        help_text="Require at least one numeric digit"
    )
    password_require_special = models.BooleanField(
        default=False,
        help_text="Require at least one special character"
    )
    password_reject_common = models.BooleanField(
        default=True,
        help_text="Reject commonly used passwords"
    )

    # MFA Policy
    mfa_required_for_admins = models.BooleanField(
        default=False,
        help_text="Require MFA for Owner, Admin, Finance, HR, Security roles"
    )
    mfa_required_for_all = models.BooleanField(
        default=False,
        help_text="Require MFA for all staff"
    )

    # Session Policy
    session_timeout_minutes = models.PositiveIntegerField(
        default=480,  # 8 hours
        help_text="Idle session timeout in minutes"
    )
    max_concurrent_sessions = models.PositiveIntegerField(
        default=5,
        help_text="Maximum concurrent sessions per user"
    )

    # Lockout Policy
    max_failed_login_attempts = models.PositiveIntegerField(
        default=5,
        help_text="Failed login attempts before temporary lockout"
    )
    lockout_duration_minutes = models.PositiveIntegerField(
        default=15,
        help_text="Lockout duration in minutes"
    )

    # Security Notifications
    notify_on_failed_logins = models.BooleanField(
        default=True,
        help_text="Alert admins on repeated failed login attempts"
    )
    failed_login_alert_threshold = models.PositiveIntegerField(
        default=3,
        help_text="Number of failed logins before alerting admins"
    )
    notify_on_privilege_changes = models.BooleanField(
        default=True,
        help_text="Alert on role/permission changes"
    )
    notify_on_mfa_changes = models.BooleanField(
        default=True,
        help_text="Alert on MFA enable/disable"
    )

    class Meta:
        verbose_name = "Security Policy"
        verbose_name_plural = "Security Policies"

    def __str__(self):
        return f"Security Policy for Restaurant {self.restaurant_id}"


# ---------------------------------------------------------------------------
# Security Incident
# ---------------------------------------------------------------------------
class IncidentStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    INVESTIGATING = "INVESTIGATING", "Investigating"
    CONTAINED = "CONTAINED", "Contained"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"


class IncidentSeverity(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical"


class SecurityIncident(UUIDModel, TimeStampedModel):
    """
    Security incident tracking and workflow management.
    """
    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        on_delete=models.CASCADE,
        related_name="security_incidents",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    severity = models.CharField(
        max_length=10,
        choices=IncidentSeverity.choices,
        default=IncidentSeverity.MEDIUM,
        db_index=True,
    )
    status = models.CharField(
        max_length=15,
        choices=IncidentStatus.choices,
        default=IncidentStatus.OPEN,
        db_index=True,
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reported_incidents",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_incidents",
    )
    affected_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="affecting_incidents",
    )
    related_events = models.ManyToManyField(
        SecurityEvent,
        blank=True,
        related_name="incidents",
    )
    notes = models.JSONField(
        default=list,
        blank=True,
        help_text="Chronological investigation notes [{timestamp, author, text}]"
    )
    actions_taken = models.JSONField(
        default=list,
        blank=True,
        help_text="Actions taken to contain/resolve [{timestamp, author, action}]"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Security Incident"
        verbose_name_plural = "Security Incidents"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "status", "created_at"]),
            models.Index(fields=["restaurant", "severity"]),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.title} ({self.status})"


# ---------------------------------------------------------------------------
# Data Retention Policy
# ---------------------------------------------------------------------------
class RetentionCategory(models.TextChoices):
    AUDIT_LOGS = "AUDIT_LOGS", "Audit Logs"
    SECURITY_EVENTS = "SECURITY_EVENTS", "Security Events"
    CUSTOMER_DATA = "CUSTOMER_DATA", "Customer Data"
    SUPPORT_DATA = "SUPPORT_DATA", "Support Data"
    EXPORT_FILES = "EXPORT_FILES", "Export Files"
    WORKFLOW_EXECUTIONS = "WORKFLOW_EXECUTIONS", "Workflow Executions"
    NOTIFICATIONS = "NOTIFICATIONS", "Notifications"
    SESSION_DATA = "SESSION_DATA", "Session Data"


class DataRetentionPolicy(UUIDModel, TimeStampedModel):
    """
    Configurable data retention policies per tenant.
    """
    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        on_delete=models.CASCADE,
        related_name="retention_policies",
    )
    category = models.CharField(
        max_length=30,
        choices=RetentionCategory.choices,
        db_index=True,
    )
    retention_days = models.PositiveIntegerField(
        default=365,
        help_text="Number of days to retain data before eligible for cleanup"
    )
    is_active = models.BooleanField(default=True)
    auto_delete = models.BooleanField(
        default=False,
        help_text="If true, data will be automatically purged after retention period. "
                  "If false, data is only flagged for review."
    )

    class Meta:
        verbose_name = "Data Retention Policy"
        verbose_name_plural = "Data Retention Policies"
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "category"],
                name="unique_retention_per_category",
            ),
        ]

    def __str__(self):
        return f"{self.category} — {self.retention_days} days (Restaurant {self.restaurant_id})"


# ---------------------------------------------------------------------------
# Login Attempt Log (for suspicious activity detection)
# ---------------------------------------------------------------------------
class LoginAttemptLog(UUIDModel):
    """
    Granular login attempt tracking for suspicious activity detection.
    Records every login attempt (success or failure) with metadata.
    """
    email = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="login_attempts",
    )
    success = models.BooleanField(default=False, db_index=True)
    ip_address = models.CharField(max_length=45, blank=True, default="")
    user_agent = models.CharField(max_length=500, blank=True, default="")
    failure_reason = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Login Attempt Log"
        verbose_name_plural = "Login Attempt Logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
            models.Index(fields=["success", "created_at"]),
        ]

    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{status} login attempt for {self.email} at {self.created_at}"
