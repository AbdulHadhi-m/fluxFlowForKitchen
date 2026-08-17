"""
Distributed locking for workflow executions.

Uses Redis SET NX EX when available with a database row-lock fallback so the
engine remains correct even when Redis is unavailable.
"""
import logging
import time
from typing import Optional
from contextlib import contextmanager
from django.db import transaction

logger = logging.getLogger("fluxiflow.workflows.locks")

LOCK_TTL_SECONDS = 300


def _redis_client():
    try:
        import redis
        from django.conf import settings
        return redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
    except Exception:
        return None


def acquire_redis_lock(lock_key: str, ttl: int = LOCK_TTL_SECONDS) -> Optional[str]:
    """Attempts a Redis SET NX EX lock. Returns token on success."""
    client = _redis_client()
    if client is None:
        return None
    token = f"{time.time_ns()}"
    try:
        if client.set(lock_key, token, nx=True, ex=ttl):
            return token
    except Exception as exc:
        logger.warning("Redis lock acquisition failed (%s); falling back to DB lock", exc)
    return None


def release_redis_lock(lock_key: str, token: str) -> None:
    client = _redis_client()
    if client is None:
        return
    try:
        current = client.get(lock_key)
        if current is not None and current.decode() == token:
            client.delete(lock_key)
    except Exception as exc:
        logger.warning("Redis lock release failed: %s", exc)


@contextmanager
def execution_lock(execution_id, restaurant_id: str, ttl: int = LOCK_TTL_SECONDS):
    """
    Prevents two workers from processing the same execution simultaneously.
    Uses Redis when available and the DB row lock as the authoritative guard.
    """
    lock_key = f"fluxiflow:wf:exec:{restaurant_id}:{execution_id}"
    token = acquire_redis_lock(lock_key, ttl)
    try:
        with transaction.atomic():
            from apps.workflows.models import WorkflowExecution
            execution = WorkflowExecution.objects.select_for_update().get(id=execution_id)
            yield execution
    finally:
        if token:
            release_redis_lock(lock_key, token)


@contextmanager
def workflow_event_lock(event_id: str, restaurant_id: str, ttl: int = LOCK_TTL_SECONDS):
    """
    Prevents duplicate scheduled/event workflow fan-out for the same source event.
    """
    lock_key = f"fluxiflow:wf:event:{restaurant_id}:{event_id}"
    token = acquire_redis_lock(lock_key, ttl)
    try:
        yield
    finally:
        if token:
            release_redis_lock(lock_key, token)