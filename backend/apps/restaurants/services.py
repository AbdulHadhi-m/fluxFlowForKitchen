from datetime import time
from django.db import transaction
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from apps.restaurants.models import Restaurant, BusinessHour
from apps.rbac.models import TenantMembership, Role
from apps.rbac.services import RBACService

class RestaurantService:
    """
    Domain service governing Restaurant tenant lifecycle, business hours, and authorized context.
    """

    @classmethod
    def get_user_restaurant(cls, user) -> Restaurant:
        """
        Resolves the current restaurant context for an authenticated staff member.
        PRD Rule: Every authenticated employee belongs to exactly one restaurant.
        """
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication credentials required.")

        membership = TenantMembership.objects.filter(user=user, is_active=True).first()
        if not membership:
            raise NotFound("You are not associated with any active restaurant.")

        restaurant = Restaurant.objects.filter(id=membership.tenant_id, is_active=True).first()
        if not restaurant:
            raise NotFound("Associated restaurant organization not found or inactive.")

        return restaurant

    @classmethod
    def create_restaurant(cls, user, **data) -> tuple[Restaurant, TenantMembership]:
        """
        Atomically creates a new restaurant organization, sets up standard 7-day business hours,
        and establishes the owner's TenantMembership with the RESTAURANT_ADMIN role.
        """
        # Ensure system roles are seeded
        admin_role = Role.objects.filter(code="RESTAURANT_ADMIN", is_system=True).first()
        if not admin_role:
            RBACService.seed_system_roles_and_permissions()
            admin_role = Role.objects.filter(code="RESTAURANT_ADMIN", is_system=True).first()

        with transaction.atomic():
            restaurant = Restaurant.objects.create(**data)

            # Seed default 7-day business hours (Mon-Sun: 09:00 - 22:00)
            default_hours = []
            for day in range(7):
                default_hours.append(
                    BusinessHour(
                        restaurant=restaurant,
                        day_of_week=day,
                        opening_time=time(9, 0),
                        closing_time=time(22, 0),
                        is_closed=False,
                        is_overnight=False,
                    )
                )
            BusinessHour.objects.bulk_create(default_hours)

            # Establish initial owner membership
            membership = TenantMembership.objects.create(
                user=user,
                tenant_id=restaurant.id,
                active_role=admin_role,
            )
            membership.assigned_roles.add(admin_role)

            return restaurant, membership

    @classmethod
    def update_restaurant(cls, restaurant: Restaurant, **data) -> Restaurant:
        """Update restaurant profile details."""
        for field, value in data.items():
            setattr(restaurant, field, value)
        restaurant.save()
        return restaurant

    @classmethod
    def update_business_hours(cls, restaurant: Restaurant, hours_data: list[dict]):
        """
        Batch update 7-day operating hours schedule for restaurant.
        """
        with transaction.atomic():
            for item in hours_data:
                day = item.get("day_of_week")
                BusinessHour.objects.update_or_create(
                    restaurant=restaurant,
                    day_of_week=day,
                    defaults={
                        "opening_time": item.get("opening_time"),
                        "closing_time": item.get("closing_time"),
                        "is_closed": item.get("is_closed", False),
                        "is_overnight": item.get("is_overnight", False),
                    },
                )
        return restaurant.business_hours.all()
