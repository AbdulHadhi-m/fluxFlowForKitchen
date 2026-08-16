import hashlib
import uuid
from datetime import timedelta
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from apps.core.models import UUIDModel, TimeStampedModel, SoftDeletableModel

class UserManager(BaseUserManager):
    """Custom manager for User model using email as unique identifier."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin, UUIDModel, TimeStampedModel, SoftDeletableModel):
    """
    Custom User Model for Fluxiflow for Kitchen.
    Uses Email as primary authentication credential with account lockout security.
    """
    email = models.EmailField(
        unique=True,
        db_index=True,
        max_length=255,
        help_text="User's primary email address for authentication"
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Designates whether this user account is active."
    )
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into the Django admin site."
    )
    failed_login_attempts = models.PositiveIntegerField(
        default=0,
        help_text="Consecutive failed login attempts count for lockout enforcement"
    )
    locked_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp until which the account remains locked"
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.email

    def is_locked_out(self):
        """Check if the account is currently locked due to excessive failed attempts."""
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False

    def register_failed_login(self, max_attempts=5, lockout_minutes=15):
        """Register a failed login attempt and apply lockout if threshold exceeded."""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= max_attempts:
            self.locked_until = timezone.now() + timedelta(minutes=lockout_minutes)
        self.save(update_fields=["failed_login_attempts", "locked_until"])

    def reset_failed_logins(self):
        """Reset failed login count and lockout status upon successful authentication."""
        if self.failed_login_attempts > 0 or self.locked_until is not None:
            self.failed_login_attempts = 0
            self.locked_until = None
            self.save(update_fields=["failed_login_attempts", "locked_until"])

class UserSession(UUIDModel):
    """
    Tracks active user authentication sessions and refresh tokens.
    Enables remote logout, session termination, and refresh token rotation/revocation.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sessions",
        help_text="Authenticated user owning this session"
    )
    refresh_token_hash = models.CharField(
        max_length=64,
        db_index=True,
        help_text="SHA-256 hash of the issued refresh token for rotation validation"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="Client IP address where session originated"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="Raw browser User-Agent string"
    )
    device_info = models.CharField(
        max_length=255,
        blank=True,
        help_text="Parsed device or browser identifier"
    )
    is_revoked = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Flag indicating whether this session has been terminated"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(
        db_index=True,
        help_text="Session expiration timestamp"
    )

    class Meta:
        verbose_name = "User Session"
        verbose_name_plural = "User Sessions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_revoked", "expires_at"]),
        ]

    def __str__(self):
        return f"Session {self.id} for {self.user.email}"

    @classmethod
    def hash_token(cls, token: str) -> str:
        """Compute SHA-256 hash of a refresh token."""
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def revoke(self):
        """Revoke this session."""
        self.is_revoked = True
        self.save(update_fields=["is_revoked"])

    def is_valid(self) -> bool:
        """Check if session is active and unexpired."""
        return (not self.is_revoked) and (self.expires_at > timezone.now())

class PasswordResetToken(UUIDModel):
    """
    Stores cryptographically secure single-use password reset tokens.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens"
    )
    token_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="SHA-256 hash of the raw reset token"
    )
    is_used = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether this reset token has already been consumed"
    )
    expires_at = models.DateTimeField(
        db_index=True,
        help_text="Token expiration timestamp (default: 15 minutes)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Password Reset Token"
        verbose_name_plural = "Password Reset Tokens"
        ordering = ["-created_at"]

    @classmethod
    def hash_token(cls, raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    def is_valid(self) -> bool:
        return (not self.is_used) and (self.expires_at > timezone.now())

    def mark_as_used(self):
        self.is_used = True
        self.save(update_fields=["is_used"])
