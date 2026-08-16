"""WebSocket routing configuration for Django Channels."""
from apps.kitchen.routing import websocket_urlpatterns as kitchen_ws_urlpatterns

websocket_urlpatterns = [
    *kitchen_ws_urlpatterns,
]
