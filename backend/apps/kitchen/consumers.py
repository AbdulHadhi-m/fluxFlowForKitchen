import json
import logging
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.restaurants.services import RestaurantService

logger = logging.getLogger("fluxiflow.kitchen.ws")

class KitchenConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer delivering real-time kitchen ticket creation, bump bar state transitions,
    and cancellation notifications scoped strictly to the authenticated restaurant tenant.
    """

    async def connect(self):
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token_list = query_params.get("token", [])

        if not token_list:
            logger.warning("Rejecting anonymous WebSocket connection to kitchen channel.")
            await self.close(code=4001)
            return

        token = token_list[0]
        user, restaurant = await self.authenticate_user(token)

        if not user or not restaurant:
            logger.warning("Rejecting invalid token / missing restaurant context for kitchen WS.")
            await self.close(code=4003)
            return

        self.user = user
        self.restaurant = restaurant
        self.group_name = f"restaurant_{restaurant.id}_kitchen"

        # Join restaurant kitchen group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()
        await self.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "restaurant_id": str(restaurant.id),
            "restaurant_name": restaurant.name,
        })
        from apps.monitoring.ws_monitor import WSMonitor

        await WSMonitor.track_connect("kitchen")
        logger.info(f"User {user.email} joined kitchen stream for {restaurant.name}")

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            from apps.monitoring.ws_monitor import WSMonitor

            await WSMonitor.track_disconnect("kitchen")
            logger.info(f"WebSocket disconnected from {self.group_name}")

    async def kitchen_event(self, event):
        """Receive message from restaurant group and push down to WebSocket client."""
        await self.send_json(event)

    @database_sync_to_async
    def authenticate_user(self, token_str: str):
        try:
            token = AccessToken(token_str)
            user_id = token["user_id"]
            user = User.objects.filter(id=user_id, is_active=True).first()
            if not user:
                return None, None

            restaurant = RestaurantService.get_user_restaurant(user)
            return user, restaurant
        except Exception as e:
            logger.warning(f"WebSocket JWT authentication error: {e}")
            return None, None
