import re
from decimal import Decimal
from typing import Any, Dict, Optional
from uuid import UUID
from datetime import datetime, date

SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "access_token",
    "refresh_token",
    "token",
    "secret",
    "api_key",
    "card_number",
    "cvv",
    "cvc",
    "pin",
    "authorization",
    "bank_account",
}

class AuditDataSanitizer:
    """Removes secrets, masks sensitive fields, and normalizes values for audit trail."""

    @classmethod
    def sanitize(cls, data: Any) -> Any:
        if isinstance(data, dict):
            sanitized = {}
            for k, v in data.items():
                lower_k = str(k).lower()
                if any(sens in lower_k for sens in SENSITIVE_KEYS):
                    sanitized[k] = "[REDACTED]"
                else:
                    sanitized[k] = cls.sanitize(v)
            return sanitized
        elif isinstance(data, list):
            return [cls.sanitize(item) for item in data]
        elif isinstance(data, (Decimal, UUID)):
            return str(data)
        elif isinstance(data, (datetime, date)):
            return data.isoformat()
        return data

class RequestContextHelper:
    """Extracts client network metadata and correlation identifiers."""

    @classmethod
    def get_client_ip(cls, request) -> str:
        if not request:
            return ""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            # First IP in comma-separated proxy list
            ip = x_forwarded_for.split(",")[0].strip()
            return ip
        return request.META.get("REMOTE_ADDR", "")

    @classmethod
    def get_user_agent(cls, request) -> str:
        if not request:
            return ""
        ua = request.META.get("HTTP_USER_AGENT", "")
        return ua[:250] if ua else ""

    @classmethod
    def get_correlation_id(cls, request) -> str:
        if not request:
            return ""
        return getattr(request, "correlation_id", None) or request.META.get("HTTP_X_CORRELATION_ID", "")
