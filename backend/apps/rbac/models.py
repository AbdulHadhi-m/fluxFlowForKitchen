import uuid
from django.db import models
from django.conf import settings
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel

class Permission(UUIDModel, TimeStampedModel):
    """
    Granular Permission model defining resource-level capabilities.
    Code naming convention: `resource.action` (e.g., `orders.create`, `menu.view`).
    """
    resource = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Target domain resource (e.g., orders, menu, tables, billing)"
    )
    action = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Permitted action (e.g., view, create, update, delete, bump, pay)"
    )
    code = models.CharField(
        max_length=128,
        unique=True,
        db_index=True,
        help_text="Unique permission code in format `resource.action`"
    )
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Permission"
        verbose_name_plural = "Permissions"
        ordering = ["resource", "action"]

    def __str__(self):
        return self.code

    def save(self, *args, **kwargs):
        # Auto-compute code if not explicitly given
        if not self.code and self.resource and self.action:
            self.code = f"{self.resource.strip().lower()}.{self.action.strip().lower()}"
        super().save(*args, **kwargs)

class Role(UUIDModel, TimeStampedModel, StatusModel):
    """
    Role entity mapping a set of permissions to users.
    Supports system-defined roles and custom tenant-scoped roles.
    """
    SYSTEM_ROLES = (
        ("SAAS_OWNER", "SaaS Platform Owner"),
        ("RESTAURANT_ADMIN", "Restaurant Administrator"),
        ("MANAGER", "Store Manager"),
        ("WAITER", "Waitstaff / Server"),
        ("KITCHEN_STAFF", "Kitchen Staff / Chef"),
        ("CASHIER", "Cashier / POS Operator"),
    )

    name = models.CharField(max_length=100, help_text="Human-readable role title")
    code = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Programmatic role slug (e.g., MANAGER, WAITER)"
    )
    description = models.TextField(blank=True)
    is_system = models.BooleanField(
        default=False,
        db_index=True,
        help_text="System-defined roles cannot be deleted"
    )
    tenant_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Tenant UUID for custom roles, or null for global system roles"
    )
    permissions = models.ManyToManyField(
        Permission,
        related_name="roles",
        blank=True,
        help_text="Permissions granted to this role"
    )

    class Meta:
        verbose_name = "Role"
        verbose_name_plural = "Roles"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["code", "tenant_id"],
                name="unique_role_code_per_tenant"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

class TenantMembership(UUIDModel, TimeStampedModel, StatusModel):
    """
    Represents a user's membership and authorization binding within a specific restaurant/tenant.
    Maintains multiple assigned roles and the single currently active role.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
        help_text="User belonging to this tenant organization"
    )
    tenant_id = models.UUIDField(
        db_index=True,
        help_text="Restaurant/Tenant UUID"
    )
    assigned_roles = models.ManyToManyField(
        Role,
        related_name="memberships",
        blank=True,
        help_text="All roles assigned to the user within this tenant"
    )
    active_role = models.ForeignKey(
        Role,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        help_text="Currently active role for permission scoping"
    )

    class Meta:
        verbose_name = "Tenant Membership"
        verbose_name_plural = "Tenant Memberships"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "tenant_id"],
                name="unique_user_tenant_membership"
            ),
        ]

    def __str__(self):
        active = self.active_role.code if self.active_role else "None"
        return f"{self.user.email} @ Tenant {self.tenant_id} [Active: {active}]"

    def get_effective_permissions(self) -> set[str]:
        """
        Returns the set of permission codes for the currently active role.
        Strict active role scoping: only permissions from active_role are effective.
        """
        if not self.is_active or not self.active_role or not self.active_role.is_active:
            return set()

        return set(
            self.active_role.permissions.values_list("code", flat=True)
        )
