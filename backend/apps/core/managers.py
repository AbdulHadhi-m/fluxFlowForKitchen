from django.db import models

class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet that excludes soft-deleted items by default."""
    def delete(self):
        """Perform bulk soft deletion."""
        return self.update(is_deleted=True)

    def hard_delete(self):
        """Perform actual permanent database deletion."""
        return super().delete()

    def active(self):
        """Filter only active (non-deleted) records."""
        return self.filter(is_deleted=False)

    def deleted(self):
        """Filter only soft-deleted records."""
        return self.filter(is_deleted=True)

class SoftDeleteManager(models.Manager.from_queryset(SoftDeleteQuerySet)):
    """Default Manager that filters out soft-deleted records."""
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

    def all_with_deleted(self):
        """Access all records including soft-deleted ones."""
        return super().get_queryset()

class TenantScopedQuerySet(models.QuerySet):
    """QuerySet that provides tenant-filtering convenience methods."""
    def for_tenant(self, tenant_id):
        """Filter records belonging strictly to the specified tenant."""
        return self.filter(tenant_id=tenant_id)

    def for_branch(self, tenant_id, branch_id):
        """Filter records belonging to a specific branch of a tenant."""
        return self.filter(tenant_id=tenant_id, branch_id=branch_id)

class TenantScopedManager(models.Manager.from_queryset(TenantScopedQuerySet)):
    """Manager providing tenant-scoped query capabilities."""
    pass

class TenantSoftDeleteQuerySet(SoftDeleteQuerySet, TenantScopedQuerySet):
    """QuerySet combining both soft delete exclusion and tenant filtering."""
    pass

class TenantSoftDeleteManager(models.Manager.from_queryset(TenantSoftDeleteQuerySet)):
    """Default manager for TenantAwareModel: filters out soft-deleted records."""
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

    def all_with_deleted(self):
        """Access all records including soft-deleted ones for a tenant."""
        return super().get_queryset()
