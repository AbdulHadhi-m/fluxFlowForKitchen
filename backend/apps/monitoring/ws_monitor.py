"""WebSocket connection monitoring.

Active connection counts per consumer type are tracked in Redis (low
cardinality). If Redis is unavailable the monitor degrades gracefully and
reports unknown rather than failing the socket lifecycle. All operations are
fire-and-forget so socket connect/disconnect latency is never affected.
"""
import asyncio
import logging
import threading

from django.conf import settings

logger = logging.getLogger("fluxiflow.monitoring.ws")

_CONNECTIONS_KEY = "fluxiflow:ws:connections"
_TOTAL_KEY = "fluxiflow:ws:total_connections"

_client = None
_client_lock = threading.Lock()


def _get_client():
    global _client
    if _client is None:
        import redis.asyncio as aioredis

        with _client_lock:
            if _client is None:
                _client = aioredis.from_url(
                    settings.REDIS_URL, socket_connect_timeout=0.5, socket_timeout=0.5
                )
    return _client


class WSMonitor:
    """Tracks active WebSocket connections by consumer type (non-blocking)."""

    @classmethod
    async def _run(cls, coro_factory):
        try:
            coro = coro_factory(_get_client())
            await asyncio.wait_for(coro, timeout=1.0)
        except Exception:  # pragma: no cover - Redis unavailable
            logger.debug("WS monitor command skipped (Redis unavailable)")

    @classmethod
    async def track_connect(cls, consumer_type: str) -> None:
        await cls._run(
            lambda client: client.hincrby(_CONNECTIONS_KEY, consumer_type, 1)
        )

    @classmethod
    async def track_disconnect(cls, consumer_type: str) -> None:
        async def _decrement(client):
            current = int(await client.hget(_CONNECTIONS_KEY, consumer_type) or 0)
            if current > 0:
                await client.hincrby(_CONNECTIONS_KEY, consumer_type, -1)

        await cls._run(_decrement)

    @classmethod
    async def snapshot(cls) -> dict:
        """Return {consumer_type: active_connections} or {} if Redis is down."""
        try:
            client = _get_client()
            raw = await asyncio.wait_for(client.hgetall(_CONNECTIONS_KEY), timeout=1.0)
            return {key.decode() if isinstance(key, bytes) else key: int(value) for key, value in raw.items()}
        except Exception:  # pragma: no cover
            return {}

    @classmethod
    async def total_connections(cls) -> int:
        try:
            client = _get_client()
            value = await asyncio.wait_for(client.get(_TOTAL_KEY), timeout=1.0)
            return int(value or 0)
        except Exception:  # pragma: no cover
            return 0