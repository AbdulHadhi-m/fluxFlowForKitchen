import logging
from typing import Any, Dict, Optional
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.audit.models import (
    AuditLog,
    AuditAction,
    AuditEntityType,
    AuditActorType,
)
from apps.audit.utils import AuditDataSanitizer, RequestContextHelper

logger = logging.getLogger("fluxiflow.audit")

class AuditLogService:
    """Centralized creation and recording service for immutable audit logs."""

    @classmethod
    def record(
        cls,
        action: str,
        entity_type: str,
        entity_id: Any = "",
        description: str = "",
        restaurant: Optional[Restaurant] = None,
        actor_user: Optional[User] = None,
        actor_role: str = "",
        actor_type: str = AuditActorType.USER,
        before_data: Optional[Dict[str, Any]] = None,
        after_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request=None,
    ) -> AuditLog:
        """
        Sanitizes and persists an append-only audit event record.
        """
        # Resolve request context if request provided
        ip_addr = ""
        user_agent_str = ""
        corr_id = ""

        if request:
            ip_addr = RequestContextHelper.get_client_ip(request)
            user_agent_str = RequestContextHelper.get_user_agent(request)
            corr_id = RequestContextHelper.get_correlation_id(request)

            if not actor_user and hasattr(request, "user") and request.user.is_authenticated:
                actor_user = request.user

            if not restaurant and hasattr(request, "restaurant"):
                restaurant = request.restaurant

        # Derive actor email snapshot
        actor_email = actor_user.email if actor_user else ""

        # Sanitize sensitive data
        sanitized_before = AuditDataSanitizer.sanitize(before_data or {})
        sanitized_after = AuditDataSanitizer.sanitize(after_data or {})
        sanitized_metadata = AuditDataSanitizer.sanitize(metadata or {})

        try:
            audit_log = AuditLog.objects.create(
                restaurant=restaurant,
                actor_user=actor_user,
                actor_email=actor_email,
                actor_role=actor_role or "",
                actor_type=actor_type,
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id else "",
                description=description.strip(),
                before_data=sanitized_before,
                after_data=sanitized_after,
                metadata=sanitized_metadata,
                ip_address=ip_addr,
                user_agent=user_agent_str,
                correlation_id=corr_id,
            )
            return audit_log
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}", exc_info=True)
            raise

    @classmethod
    def log(
        cls,
        action: str,
        entity_type: str,
        entity_id: Any = "",
        description: str = "",
        restaurant: Optional[Restaurant] = None,
        actor: Optional[User] = None,
        actor_role: str = "",
        **kwargs,
    ) -> AuditLog:
        return cls.record(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            restaurant=restaurant,
            actor_user=actor,
            actor_role=actor_role,
            **kwargs,
        )


AuditService = AuditLogService
