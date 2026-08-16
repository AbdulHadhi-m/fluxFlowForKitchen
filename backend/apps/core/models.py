import uuid
from django.db import models
from django.utils import timezone
from .managers import (
    TenantScopedManager,
    SoftDeleteManager,
    TenantSoftDeleteManager,
)

class UUIDModel(models.Model):
    """Abstract base model providing a UUIDv4 primary key."""
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Globally unique identifier"
    )

    class Meta:
        abstract = True

class TimeStampedModel(models.Model):
    """Abstract base model providing self-updating created_at and updated_at fields."""
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when the record was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the record was last updated"
    )

    class Meta:
        abstract = True

class SoftDeletableModel(models.Model):
    """Abstract base model providing soft delete functionality."""
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft deletion flag"
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the record was soft deleted"
    )

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def soft_delete(self):
        """Mark the instance as soft deleted with a timestamp."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])

    def restore(self):
        """Restore a previously soft deleted instance."""
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "deleted_at"])

class StatusModel(models.Model):
    """Abstract mixin providing active/inactive status."""
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Active status flag"
    )

    class Meta:
        abstract = True

class TenantAwareModel(UUIDModel, TimeStampedModel, SoftDeletableModel):
    """
    Master abstract base model for all tenant-scoped entities across Fluxiflow.
    Combines UUID primary key, timestamp tracking, soft deletion, and mandatory tenant scoping.
    """
    tenant_id = models.UUIDField(
        db_index=True,
        help_text="Tenant (Restaurant) UUID for strict multi-tenant isolation"
    )
    branch_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Branch/Outlet UUID for multi-branch organizations"
    )

    objects = TenantSoftDeleteManager()
    unfiltered = models.Manager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["tenant_id", "branch_id"], name="%(app_label)s_%(class)s_t_b_idx"),
            models.Index(fields=["tenant_id", "is_deleted"], name="%(app_label)s_%(class)s_t_d_idx"),
        ]
