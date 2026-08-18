import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger("fluxiflow.notifications.ws")

class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for user-scoped real-time alerts and system alerts.
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
            logger.warning("Unauthenticated WebSocket connection rejected.")
            await self.close(code=4001)
            return

        self.user = user
        self.user_group = f"user_{user.id}"

        await self.channel_layer.group_add(
            self.user_group,
            self.channel_name,
        )
        await self.accept()
        from apps.monitoring.ws_monitor import WSMonitor

        await WSMonitor.track_connect("notifications")
        logger.info(f"User {user.email} connected to notification channel {self.user_group}.")

    async def disconnect(self, close_code):
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(
                self.user_group,
                self.channel_name,
            )
        from apps.monitoring.ws_monitor import WSMonitor

        await WSMonitor.track_disconnect("notifications")

    async def receive_json(self, content, **kwargs):
        # Heartbeat ping/pong support
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def notification_message(self, event):
        """Dispatches notification to client."""
        await self.send_json({
            "type": "notification.created",
            "data": event.get("data", {}),
        })

    async def system_alert(self, event):
        """Dispatches a system-wide alert (monitoring, superuser channels)."""
        await self.send_json({
            "type": "system.alert",
            "data": event.get("data", {}),
        })
