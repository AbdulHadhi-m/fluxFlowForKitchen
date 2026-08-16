import pytest
from rest_framework_simplejwt.tokens import RefreshToken
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from apps.accounts.models import User
from apps.restaurants.services import RestaurantService
from apps.rbac.services import RBACService
from apps.kitchen.consumers import KitchenConsumer
from apps.kitchen.services import KitchenService

@database_sync_to_async
def setup_test_restaurant_and_token():
    RBACService.seed_system_roles_and_permissions()
    user = User.objects.create_user(email="chef@ws.com", password="Password123!")
    restaurant, _ = RestaurantService.create_restaurant(user=user, name="WS Bistro")
    token = str(RefreshToken.for_user(user).access_token)
    return user, restaurant, token

@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_kitchen_websocket_connection_and_events():
    """Verify authenticated WebSocket connection and real-time event delivery."""
    user, restaurant, token = await setup_test_restaurant_and_token()

    # 1. Connect communicator
    communicator = WebsocketCommunicator(
        KitchenConsumer.as_asgi(),
        f"/ws/kitchen/?token={token}"
    )
    connected, _ = await communicator.connect()
    assert connected is True

    # 2. Receive connection handshake
    handshake = await communicator.receive_json_from()
    assert handshake["type"] == "CONNECTION_ESTABLISHED"
    assert handshake["restaurant_id"] == str(restaurant.id)

    # 3. Broadcast event via service and receive over socket
    KitchenService.broadcast_kitchen_event(
        restaurant_id=str(restaurant.id),
        event_type="KITCHEN_ORDER_CREATED",
        data={"order_number": "ORD-000099", "status": "NEW"}
    )

    event_msg = await communicator.receive_json_from()
    assert event_msg["event_type"] == "KITCHEN_ORDER_CREATED"
    assert event_msg["data"]["order_number"] == "ORD-000099"

    await communicator.disconnect()
