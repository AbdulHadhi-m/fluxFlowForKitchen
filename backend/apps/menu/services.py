from decimal import Decimal
from typing import Optional
from django.db import transaction
from rest_framework.exceptions import ValidationError, NotFound
from apps.restaurants.models import Restaurant
from apps.menu.models import MenuCategory, MenuItem

class MenuService:
    """
    Domain service governing Menu Category and Menu Item lifecycle, pricing integrity,
    ordering hierarchy, and tenant-scoped relationship validation.
    """

    # --------------------------------------------------------------------------
    # Category Operations
    # --------------------------------------------------------------------------

    @classmethod
    def create_category(
        cls,
        restaurant: Restaurant,
        name: str,
        description: str = "",
        display_order: int = 0,
        is_active: bool = True,
    ) -> MenuCategory:
        """Create a new menu category within the given restaurant organization."""
        name = name.strip()
        if not name:
            raise ValidationError({"name": ["Category name cannot be empty."]})

        if MenuCategory.objects.filter(restaurant=restaurant, name__iexact=name).exists():
            raise ValidationError({"name": [f"A category named '{name}' already exists in your restaurant."]})

        return MenuCategory.objects.create(
            restaurant=restaurant,
            name=name,
            description=description,
            display_order=display_order,
            is_active=is_active,
        )

    @classmethod
    def update_category(
        cls,
        category: MenuCategory,
        name: Optional[str] = None,
        description: Optional[str] = None,
        display_order: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> MenuCategory:
        """Update category attributes while preserving tenant uniqueness."""
        if name is not None:
            name = name.strip()
            if not name:
                raise ValidationError({"name": ["Category name cannot be empty."]})
            if (
                MenuCategory.objects.filter(restaurant=category.restaurant, name__iexact=name)
                .exclude(id=category.id)
                .exists()
            ):
                raise ValidationError({"name": [f"A category named '{name}' already exists in your restaurant."]})
            category.name = name

        if description is not None:
            category.description = description
        if display_order is not None:
            category.display_order = display_order
        if is_active is not None:
            category.is_active = is_active

        category.save()
        return category

    @classmethod
    def deactivate_category(cls, category: MenuCategory) -> MenuCategory:
        """Soft-deactivate a menu category."""
        category.is_active = False
        category.save(update_fields=["is_active", "updated_at"])
        return category

    # --------------------------------------------------------------------------
    # Menu Item Operations
    # --------------------------------------------------------------------------

    @classmethod
    def validate_category_in_restaurant(cls, restaurant: Restaurant, category_id) -> MenuCategory:
        """Ensure the specified category belongs to the given restaurant organization."""
        if isinstance(category_id, MenuCategory):
            category = category_id
        else:
            category = MenuCategory.objects.filter(id=category_id, restaurant=restaurant).first()

        if not category or category.restaurant_id != restaurant.id:
            raise ValidationError({"category": ["The specified category does not exist in your restaurant."]})
        return category

    @classmethod
    def create_menu_item(
        cls,
        restaurant: Restaurant,
        category_id,
        name: str,
        price: Decimal,
        description: str = "",
        is_available: bool = True,
        is_active: bool = True,
        display_order: int = 0,
    ) -> MenuItem:
        """Atomically create a menu item with tenant-scoped category verification."""
        name = name.strip()
        if not name:
            raise ValidationError({"name": ["Menu item name cannot be empty."]})

        try:
            dec_price = Decimal(str(price))
            if dec_price < Decimal("0.00"):
                raise ValidationError({"price": ["Price cannot be negative."]})
        except Exception:
            raise ValidationError({"price": ["Invalid decimal price format."]})

        category = cls.validate_category_in_restaurant(restaurant, category_id)

        with transaction.atomic():
            return MenuItem.objects.create(
                restaurant=restaurant,
                category=category,
                name=name,
                price=dec_price,
                description=description,
                is_available=is_available,
                is_active=is_active,
                display_order=display_order,
            )

    @classmethod
    def update_menu_item(
        cls,
        item: MenuItem,
        category_id=None,
        name: Optional[str] = None,
        price: Optional[Decimal] = None,
        description: Optional[str] = None,
        is_available: Optional[bool] = None,
        is_active: Optional[bool] = None,
        display_order: Optional[int] = None,
    ) -> MenuItem:
        """Update menu item details with validation."""
        with transaction.atomic():
            if category_id is not None:
                category = cls.validate_category_in_restaurant(item.restaurant, category_id)
                item.category = category

            if name is not None:
                name = name.strip()
                if not name:
                    raise ValidationError({"name": ["Menu item name cannot be empty."]})
                item.name = name

            if price is not None:
                try:
                    dec_price = Decimal(str(price))
                    if dec_price < Decimal("0.00"):
                        raise ValidationError({"price": ["Price cannot be negative."]})
                    item.price = dec_price
                except Exception:
                    raise ValidationError({"price": ["Invalid decimal price format."]})

            if description is not None:
                item.description = description
            if is_available is not None:
                item.is_available = is_available
            if is_active is not None:
                item.is_active = is_active
            if display_order is not None:
                item.display_order = display_order

            item.save()
            return item

    @classmethod
    def set_item_availability(cls, item: MenuItem, is_available: bool) -> MenuItem:
        """Quickly toggle item availability (in-stock vs 86'd)."""
        item.is_available = is_available
        item.save(update_fields=["is_available", "updated_at"])
        return item
