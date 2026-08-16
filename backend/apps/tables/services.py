from typing import Optional
from django.db import transaction
from rest_framework.exceptions import ValidationError
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable

class TableService:
    """
    Domain service for Restaurant Table lifecycle, section organization,
    operational status changes, and tenant isolation validation.
    """

    @classmethod
    def create_table(
        cls,
        restaurant: Restaurant,
        name: str,
        capacity: int = 4,
        section: str = "Main Dining",
        display_order: int = 0,
        is_active: bool = True,
    ) -> RestaurantTable:
        """Create a new restaurant table with uniqueness and capacity validation."""
        name = name.strip()
        if not name:
            raise ValidationError({"name": ["Table name/number cannot be empty."]})

        if capacity < 1:
            raise ValidationError({"capacity": ["Table capacity must be at least 1 guest seat."]})

        if RestaurantTable.objects.filter(restaurant=restaurant, name__iexact=name).exists():
            raise ValidationError({"name": [f"A table numbered/named '{name}' already exists in your restaurant."]})

        return RestaurantTable.objects.create(
            restaurant=restaurant,
            name=name,
            capacity=capacity,
            section=section.strip() or "Main Dining",
            display_order=display_order,
            is_active=is_active,
            status=RestaurantTable.TableStatus.AVAILABLE,
        )

    @classmethod
    def update_table(
        cls,
        table: RestaurantTable,
        name: Optional[str] = None,
        capacity: Optional[int] = None,
        section: Optional[str] = None,
        display_order: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> RestaurantTable:
        """Update table configuration."""
        with transaction.atomic():
            if name is not None:
                name = name.strip()
                if not name:
                    raise ValidationError({"name": ["Table name/number cannot be empty."]})
                if (
                    RestaurantTable.objects.filter(restaurant=table.restaurant, name__iexact=name)
                    .exclude(id=table.id)
                    .exists()
                ):
                    raise ValidationError({"name": [f"A table numbered/named '{name}' already exists in your restaurant."]})
                table.name = name

            if capacity is not None:
                if capacity < 1:
                    raise ValidationError({"capacity": ["Table capacity must be at least 1 guest seat."]})
                table.capacity = capacity

            if section is not None:
                table.section = section.strip() or "Main Dining"

            if display_order is not None:
                table.display_order = display_order

            if is_active is not None:
                table.is_active = is_active

            table.save()
            return table

    @classmethod
    def update_table_status(cls, table: RestaurantTable, status_value: str) -> RestaurantTable:
        """Controlled status mutation (AVAILABLE, OCCUPIED, RESERVED, OUT_OF_SERVICE)."""
        valid_statuses = RestaurantTable.TableStatus.values
        if status_value not in valid_statuses:
            raise ValidationError({"status": [f"Invalid status '{status_value}'. Supported: {valid_statuses}"]})

        table.status = status_value
        table.save(update_fields=["status", "updated_at"])
        return table

    @classmethod
    def deactivate_table(cls, table: RestaurantTable) -> RestaurantTable:
        """Soft-deactivate a table from floor operations."""
        table.is_active = False
        table.save(update_fields=["is_active", "updated_at"])
        return table

    @classmethod
    def activate_table(cls, table: RestaurantTable) -> RestaurantTable:
        """Reactivate a table on the operational floor."""
        table.is_active = True
        table.save(update_fields=["is_active", "updated_at"])
        return table
