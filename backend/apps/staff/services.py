import uuid
from typing import List, Optional
from django.db import transaction
from django.utils.crypto import get_random_string
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound
from apps.accounts.models import User, UserSession
from apps.restaurants.models import Restaurant
from apps.rbac.models import Role, TenantMembership
from apps.staff.models import StaffProfile

class StaffService:
    """
    Domain service for Staff / Employee lifecycle management, role hierarchies,
    and session invalidation.
    """

    @classmethod
    def generate_next_employee_id(cls, restaurant: Restaurant) -> str:
        """
        Generates the next sequential employee ID for a restaurant (e.g., EMP-001, EMP-002).
        """
        count = StaffProfile.objects.filter(restaurant=restaurant).count() + 1
        return f"EMP-{count:03d}"

    @classmethod
    def resolve_role(cls, role_identifier) -> Role:
        """Resolve a Role from UUID or code slug."""
        if isinstance(role_identifier, Role):
            return role_identifier
        try:
            role_uuid = uuid.UUID(str(role_identifier))
            role = Role.objects.filter(id=role_uuid, is_active=True).first()
        except (ValueError, TypeError):
            role = Role.objects.filter(code=str(role_identifier).upper(), is_active=True).first()

        if not role:
            raise ValidationError(f"Role '{role_identifier}' is not a valid or active role.")
        if role.code == "SAAS_OWNER":
            raise ValidationError("The 'SAAS_OWNER' platform role cannot be assigned to restaurant staff.")
        return role

    @classmethod
    def create_staff_member(
        cls,
        restaurant: Restaurant,
        email: str,
        first_name: str = "",
        last_name: str = "",
        phone: str = "",
        primary_role_identifier: str = "WAITER",
        secondary_role_identifiers: Optional[List[str]] = None,
        password: Optional[str] = None,
        employee_id: Optional[str] = None,
    ) -> StaffProfile:
        """
        Atomically provisions a staff user account, tenant membership, and staff profile
        with exactly ONE primary role and zero or more secondary roles.
        """
        email = email.strip().lower()
        if not email:
            raise ValidationError({"email": ["Email is required."]})

        # Resolve and validate Primary Role
        primary_role = cls.resolve_role(primary_role_identifier)

        # Resolve and validate Secondary Roles
        secondary_roles = []
        if secondary_role_identifiers:
            for r_id in secondary_role_identifiers:
                sec_role = cls.resolve_role(r_id)
                if sec_role.id == primary_role.id:
                    raise ValidationError({"secondary_roles": ["Primary role cannot be duplicated as a secondary role."]})
                if sec_role not in secondary_roles:
                    secondary_roles.append(sec_role)

        with transaction.atomic():
            # Check or create User authentication record
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_active": True,
                },
            )
            if created:
                raw_password = password or get_random_string(16)
                user.set_password(raw_password)
                user.save()

            # Check if user is already a member of this restaurant
            if StaffProfile.objects.filter(restaurant=restaurant, user=user).exists():
                raise ValidationError({"email": ["This user is already an active staff member in this restaurant."]})

            # Create or reuse TenantMembership
            membership, _ = TenantMembership.objects.get_or_create(
                user=user,
                tenant_id=restaurant.id,
                defaults={"active_role": primary_role, "is_active": True},
            )
            membership.active_role = primary_role
            membership.is_active = True
            membership.save()

            # Assign sequential Employee ID if not provided
            emp_id = employee_id or cls.generate_next_employee_id(restaurant)
            while StaffProfile.objects.filter(restaurant=restaurant, employee_id=emp_id).exists():
                count = StaffProfile.objects.filter(restaurant=restaurant).count() + 2
                emp_id = f"EMP-{count:03d}"

            # Create Staff Profile
            staff = StaffProfile.objects.create(
                user=user,
                restaurant=restaurant,
                membership=membership,
                employee_id=emp_id,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                email=email,
                primary_role=primary_role,
                status=StaffProfile.StaffStatus.ACTIVE,
            )

            # Assign secondary roles and sync
            if secondary_roles:
                staff.secondary_roles.set(secondary_roles)
            staff.sync_membership_roles()

            return staff

    @classmethod
    def update_staff_member(
        cls,
        staff: StaffProfile,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        phone: Optional[str] = None,
        primary_role_identifier: Optional[str] = None,
        secondary_role_identifiers: Optional[List[str]] = None,
        status: Optional[str] = None,
    ) -> StaffProfile:
        """
        Updates staff details, roles, and status with immediate membership synchronization.
        """
        with transaction.atomic():
            if first_name is not None:
                staff.first_name = first_name
                staff.user.first_name = first_name
            if last_name is not None:
                staff.last_name = last_name
                staff.user.last_name = last_name
            if phone is not None:
                staff.phone = phone

            staff.user.save(update_fields=["first_name", "last_name"])

            # Update Primary Role
            if primary_role_identifier is not None:
                new_primary = cls.resolve_role(primary_role_identifier)
                staff.primary_role = new_primary

            # Update Secondary Roles
            if secondary_role_identifiers is not None:
                new_secondaries = []
                for r_id in secondary_role_identifiers:
                    sec_role = cls.resolve_role(r_id)
                    if sec_role.id == staff.primary_role.id:
                        raise ValidationError({"secondary_roles": ["Primary role cannot be duplicated as a secondary role."]})
                    if sec_role not in new_secondaries:
                        new_secondaries.append(sec_role)
                staff.secondary_roles.set(new_secondaries)

            # Handle Status Change
            if status is not None:
                if status == StaffProfile.StaffStatus.DISABLED:
                    cls.disable_staff_member(staff)
                elif status == StaffProfile.StaffStatus.ACTIVE:
                    cls.reactivate_staff_member(staff)

            staff.save()
            staff.sync_membership_roles()
            return staff

    @classmethod
    def disable_staff_member(cls, staff: StaffProfile) -> StaffProfile:
        """
        Disables staff member, deactivates tenant membership, and revokes all active sessions.
        """
        with transaction.atomic():
            staff.status = StaffProfile.StaffStatus.DISABLED
            staff.is_active = False
            staff.save(update_fields=["status", "is_active"])

            staff.membership.is_active = False
            staff.membership.save(update_fields=["is_active"])

            # Invalidate all active sessions for security
            UserSession.objects.filter(user=staff.user, is_revoked=False).update(is_revoked=True)
            return staff

    @classmethod
    def reactivate_staff_member(cls, staff: StaffProfile) -> StaffProfile:
        """
        Reactivates a previously disabled staff member and re-enables tenant membership.
        """
        with transaction.atomic():
            staff.status = StaffProfile.StaffStatus.ACTIVE
            staff.is_active = True
            staff.save(update_fields=["status", "is_active"])

            staff.membership.is_active = True
            staff.membership.save(update_fields=["is_active"])
            return staff
