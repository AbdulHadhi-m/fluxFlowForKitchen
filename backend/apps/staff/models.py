import uuid
from django.db import models
from django.conf import settings
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel
from apps.restaurants.models import Restaurant
from apps.rbac.models import Role, TenantMembership

class StaffProfile(UUIDModel, TimeStampedModel, StatusModel):
    """
    Staff / Employee Profile representing a user's employment and operational role within a specific restaurant.
    Maintains exactly ONE Primary Role, zero or more Secondary Roles, and a restaurant-unique Employee ID.
    """
    class StaffStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        DISABLED = "DISABLED", "Disabled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_profiles",
        help_text="Underlying user authentication account"
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="staff_members",
        help_text="Restaurant organization employing this staff member"
    )
    membership = models.OneToOneField(
        TenantMembership,
        on_delete=models.CASCADE,
        related_name="staff_profile",
        help_text="Tenant membership record managing active authorization scope"
    )
    employee_id = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Restaurant-unique employee identifier code (e.g. EMP-001)"
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(max_length=255, db_index=True)
    
    # Role Hierarchy
    primary_role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="primary_staff_members",
        help_text="Exactly ONE primary operational role governing default dashboard and initial login scope"
    )
    secondary_roles = models.ManyToManyField(
        Role,
        related_name="secondary_staff_members",
        blank=True,
        help_text="Zero or more secondary operational roles available for active role switching"
    )
    status = models.CharField(
        max_length=20,
        choices=StaffStatus.choices,
        default=StaffStatus.ACTIVE,
        db_index=True,
        help_text="Staff employment status (ACTIVE or DISABLED)"
    )

    class Meta:
        verbose_name = "Staff Profile"
        verbose_name_plural = "Staff Profiles"
        ordering = ["employee_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "employee_id"],
                name="unique_employee_id_per_restaurant"
            ),
            models.UniqueConstraint(
                fields=["restaurant", "user"],
                name="unique_user_per_restaurant_staff"
            ),
        ]
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["restaurant", "email"]),
        ]

    def __str__(self):
        return f"{self.display_name} ({self.employee_id}) - {self.primary_role.name}"

    @property
    def display_name(self) -> str:
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.email

    @property
    def all_assigned_roles(self):
        """Returns all roles (primary + secondary) assigned to this employee."""
        roles = [self.primary_role]
        roles.extend(list(self.secondary_roles.all()))
        return roles

    def sync_membership_roles(self):
        """
        Synchronizes TenantMembership.assigned_roles with StaffProfile's primary & secondary roles,
        ensuring active_role is always valid.
        """
        membership = self.membership
        all_roles = [self.primary_role] + list(self.secondary_roles.all())
        membership.assigned_roles.set(all_roles)
        
        # If current active_role is not in assigned roles or is null, default to primary_role
        if not membership.active_role or membership.active_role not in all_roles:
            membership.active_role = self.primary_role
            
        membership.is_active = (self.status == self.StaffStatus.ACTIVE)
        membership.save()
