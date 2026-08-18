"""Ambient observability context propagated across the request/task lifecycle."""

import contextvars

correlation_id_ctx = contextvars.ContextVar("correlation_id", default="")
user_id_ctx = contextvars.ContextVar("user_id", default="")
restaurant_id_ctx = contextvars.ContextVar("restaurant_id", default="")
tenant_id_ctx = contextvars.ContextVar("tenant_id", default="")