import logging
from decimal import Decimal
from typing import Any, Dict, Optional
from django.db import transaction
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.settings.models import RestaurantConfiguration, UserPreference
from apps.audit.services import AuditLogService
from apps.audit.models import AuditAction, AuditEntityType

logger = logging.getLogger("fluxiflow.settings")

class SettingsSelector:
    """Read selectors for retrieving domain-scoped configuration with safe fallbacks."""

    @classmethod
    def get_configuration(cls, restaurant: Restaurant) -> RestaurantConfiguration:
        config, _ = RestaurantConfiguration.objects.get_or_create(restaurant=restaurant)
        return config

    @classmethod
    def get_billing_settings(cls, restaurant: Restaurant) -> Dict[str, Any]:
        config = cls.get_configuration(restaurant)
        return {
            "tax_enabled": config.tax_enabled,
            "default_tax_rate": config.default_tax_rate,
            "tax_name": config.tax_name,
            "tax_registration_number": config.tax_registration_number,
            "tax_inclusive_pricing": config.tax_inclusive_pricing,
            "invoice_prefix": config.invoice_prefix,
            "receipt_prefix": config.receipt_prefix,
            "invoice_footer_notes": config.invoice_footer_notes,
            "currency": restaurant.currency,
        }

    @classmethod
    def get_kitchen_settings(cls, restaurant: Restaurant) -> Dict[str, Any]:
        config = cls.get_configuration(restaurant)
        return {
            "default_prep_time_minutes": config.default_prep_time_minutes,
            "kds_warning_threshold_minutes": config.kds_warning_threshold_minutes,
            "kds_critical_threshold_minutes": config.kds_critical_threshold_minutes,
            "auto_refresh_interval_seconds": config.auto_refresh_interval_seconds,
        }

    @classmethod
    def get_inventory_settings(cls, restaurant: Restaurant) -> Dict[str, Any]:
        config = cls.get_configuration(restaurant)
        return {
            "allow_negative_stock": config.allow_negative_stock,
            "require_wastage_reason": config.require_wastage_reason,
            "low_stock_threshold_default": config.low_stock_threshold_default,
        }

    @classmethod
    def get_order_settings(cls, restaurant: Restaurant) -> Dict[str, Any]:
        config = cls.get_configuration(restaurant)
        return {
            "allow_order_cancellation": config.allow_order_cancellation,
            "cancellation_window_minutes": config.cancellation_window_minutes,
            "require_order_confirmation": config.require_order_confirmation,
            "allow_table_orders": config.allow_table_orders,
            "allow_takeaway": config.allow_takeaway,
        }

    @classmethod
    def get_procurement_settings(cls, restaurant: Restaurant) -> Dict[str, Any]:
        config = cls.get_configuration(restaurant)
        return {
            "po_approval_required": config.po_approval_required,
            "po_approval_threshold": config.po_approval_threshold,
            "default_delivery_lead_days": config.default_delivery_lead_days,
        }

    @classmethod
    def get_user_preferences(cls, user: User) -> UserPreference:
        prefs, _ = UserPreference.objects.get_or_create(user=user)
        return prefs


class SettingsService:
    """Business service for updating operational settings and recording audit logs."""

    @classmethod
    @transaction.atomic
    def update_configuration(
        cls,
        restaurant: Restaurant,
        user: User,
        payload: Dict[str, Any],
        request=None,
    ) -> RestaurantConfiguration:
        config = SettingsSelector.get_configuration(restaurant)

        before_snapshot = {
            k: getattr(config, k)
            for k in payload.keys()
            if hasattr(config, k)
        }

        for field, value in payload.items():
            if hasattr(config, field):
                setattr(config, field, value)

        config.save()

        after_snapshot = {
            k: getattr(config, k)
            for k in payload.keys()
            if hasattr(config, k)
        }

        # Audit configuration update
        AuditLogService.record(
            action=AuditAction.UPDATE,
            entity_type=AuditEntityType.RESTAURANT,
            entity_id=str(restaurant.id),
            description=f"Updated restaurant operational settings for {restaurant.name}",
            restaurant=restaurant,
            actor_user=user,
            before_data=before_snapshot,
            after_data=after_snapshot,
            request=request,
        )

        return config

    @classmethod
    @transaction.atomic
    def update_user_preferences(
        cls,
        user: User,
        payload: Dict[str, Any],
    ) -> UserPreference:
        prefs = SettingsSelector.get_user_preferences(user)

        for field, value in payload.items():
            if hasattr(prefs, field):
                setattr(prefs, field, value)

        prefs.save()
        return prefs
