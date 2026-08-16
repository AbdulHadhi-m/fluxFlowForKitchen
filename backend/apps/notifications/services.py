import logging
from typing import List, Optional
from django.db import models, transaction
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.rbac.models import TenantMembership, Role, Permission
from apps.notifications.models import (
    Notification,
    NotificationType,
    NotificationSeverity,
    NotificationPreference,
)

logger = logging.getLogger("fluxiflow.notifications")

class NotificationRecipientResolver:
    """Finds authorized staff users for role/permission targeted alerts."""

    @classmethod
    def resolve_recipients_for_permission(
        cls,
        restaurant: Restaurant,
        permission_code: str,
    ) -> List[User]:
        """
        Finds all active restaurant staff who hold the specified permission
        via their active role or assigned roles.
        """
        memberships = TenantMembership.objects.filter(
            tenant_id=restaurant.id,
            is_active=True,
            user__is_active=True,
        ).filter(
            models.Q(active_role__permissions__code=permission_code)
            | models.Q(assigned_roles__permissions__code=permission_code)
            | models.Q(active_role__code="RESTAURANT_ADMIN")
            | models.Q(assigned_roles__code="RESTAURANT_ADMIN")
        ).select_related("user").distinct()

        return [m.user for m in memberships]

class NotificationService:
    """Central notification persistence, deduplication, and WebSocket dispatch."""

    @classmethod
    def create_notification(
        cls,
        restaurant: Restaurant,
        recipient: User,
        notification_type: str,
        title: str,
        message: str,
        severity: str = NotificationSeverity.INFO,
        action_url: str = "",
        entity_type: str = "",
        entity_id: str = "",
        deduplication_key: str = "",
    ) -> Optional[Notification]:
        """
        Persists an in-app notification and schedules a real-time WebSocket
        push upon transaction commit.
        """
        # Deduplication check
        if deduplication_key:
            exists = Notification.objects.filter(
                restaurant=restaurant,
                recipient=recipient,
                deduplication_key=deduplication_key,
                is_read=False,
            ).exists()
            if exists:
                logger.debug(f"Skipping duplicate notification for key: {deduplication_key}")
                return None

        # Check preferences if exists
        pref = NotificationPreference.objects.filter(restaurant=restaurant, user=recipient).first()
        if pref and not pref.in_app_enabled:
            return None

        notification = Notification.objects.create(
            restaurant=restaurant,
            recipient=recipient,
            notification_type=notification_type,
            severity=severity,
            title=title.strip(),
            message=message.strip(),
            action_url=action_url.strip(),
            entity_type=entity_type.strip(),
            entity_id=str(entity_id),
            deduplication_key=deduplication_key.strip(),
            is_read=False,
        )

        # Real-time WebSocket dispatch on transaction commit
        def dispatch_ws():
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    payload = {
                        "id": str(notification.id),
                        "type": notification.notification_type,
                        "severity": notification.severity,
                        "title": notification.title,
                        "message": notification.message,
                        "action_url": notification.action_url,
                        "entity_type": notification.entity_type,
                        "entity_id": notification.entity_id,
                        "is_read": False,
                        "created_at": notification.created_at.isoformat(),
                    }
                    async_to_sync(channel_layer.group_send)(
                        f"user_{recipient.id}",
                        {
                            "type": "notification_message",
                            "data": payload,
                        },
                    )
            except Exception as e:
                logger.error(f"Failed to dispatch real-time notification: {e}")

        transaction.on_commit(dispatch_ws)
        return notification

    @classmethod
    def notify_users_with_permission(
        cls,
        restaurant: Restaurant,
        permission_code: str,
        notification_type: str,
        title: str,
        message: str,
        severity: str = NotificationSeverity.INFO,
        action_url: str = "",
        entity_type: str = "",
        entity_id: str = "",
        deduplication_key_prefix: str = "",
    ) -> List[Notification]:
        """Broadcasts an alert to all staff with a specific capability/permission."""
        recipients = NotificationRecipientResolver.resolve_recipients_for_permission(
            restaurant=restaurant,
            permission_code=permission_code,
        )

        created_notifications = []
        for user in recipients:
            dedup_key = f"{deduplication_key_prefix}:{user.id}" if deduplication_key_prefix else ""
            n = cls.create_notification(
                restaurant=restaurant,
                recipient=user,
                notification_type=notification_type,
                title=title,
                message=message,
                severity=severity,
                action_url=action_url,
                entity_type=entity_type,
                entity_id=entity_id,
                deduplication_key=dedup_key,
            )
            if n:
                created_notifications.append(n)

        return created_notifications

    @classmethod
    def mark_as_read(cls, notification: Notification, user: User) -> Notification:
        """Mark single notification as read."""
        if notification.recipient_id != user.id:
            return notification

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at", "updated_at"])

        return notification

    @classmethod
    def mark_all_as_read(cls, restaurant: Restaurant, user: User) -> int:
        """Mark all notifications for user in current restaurant as read."""
        updated = Notification.objects.filter(
            restaurant=restaurant,
            recipient=user,
            is_read=False,
        ).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return updated
