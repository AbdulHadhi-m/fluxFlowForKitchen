"""
Domain event bus for the workflow engine.

Events are named, versioned, structured, tenant-aware and traceable.
Each event carries a deterministic idempotency key so the same event can
never execute the same workflow more than once.
"""
import hashlib
import logging
from typing import Any, Dict, Optional
from django.db import transaction
from django.utils import timezone
from apps.restaurants.models import Restaurant
from apps.workflows.models import WorkflowEventLog

logger = logging.getLogger("fluxiflow.workflows.events")

EVENT_VERSION = 1


class EventType:
    """Canonical domain event registry consumed by EVENT workflows."""
    ORDER_CREATED = "ORDER_CREATED"
    ORDER_COMPLETED = "ORDER_COMPLETED"
    ORDER_CANCELLED = "ORDER_CANCELLED"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    BILL_VOIDED = "BILL_VOIDED"
    INVOICE_OVERDUE = "INVOICE_OVERDUE"
    INVENTORY_LOW = "INVENTORY_LOW"
    INVENTORY_OUT = "INVENTORY_OUT"
    PURCHASE_ORDER_CREATED = "PURCHASE_ORDER_CREATED"
    PURCHASE_ORDER_RECEIVED = "PURCHASE_ORDER_RECEIVED"
    CUSTOMER_CREATED = "CUSTOMER_CREATED"
    CUSTOMER_FEEDBACK_SUBMITTED = "CUSTOMER_FEEDBACK_SUBMITTED"
    COMPLAINT_CREATED = "COMPLAINT_CREATED"
    TICKET_CREATED = "TICKET_CREATED"
    TICKET_SLA_BREACHED = "TICKET_SLA_BREACHED"
    RESERVATION_CREATED = "RESERVATION_CREATED"
    RESERVATION_CANCELLED = "RESERVATION_CANCELLED"
    EMPLOYEE_ABSENCE_RECORDED = "EMPLOYEE_ABSENCE_RECORDED"
    PAYROLL_COMPLETED = "PAYROLL_COMPLETED"
    CAMPAIGN_COMPLETED = "CAMPAIGN_COMPLETED"


ALL_EVENT_TYPES = tuple(sorted({v for k, v in vars(EventType).items() if k.isupper()}))


def build_event_id(event_type: str, restaurant_id: Any, entity_type: str, entity_id: Any, salt: str = "") -> str:
    """Deterministic idempotency key derived from the event source."""
    raw = f"{event_type}|{restaurant_id}|{entity_type}|{entity_id}|{salt}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:64]


def publish_event(
    restaurant: Restaurant,
    event_type: str,
    entity_type: str = "",
    entity_id: Any = "",
    payload: Optional[Dict[str, Any]] = None,
    salt: str = "",
    occurred_at=None,
) -> Optional[WorkflowEventLog]:
    """
    Records a domain event (idempotently) and fans out to matching ACTIVE
    EVENT-triggered workflows. Returns None when the event is a duplicate.

    The fan-out is scheduled on Celery so HTTP request handling is never
    blocked by workflow execution.
    """
    if restaurant is None:
        return None

    occurred_at = occurred_at or timezone.now()
    event_id = build_event_id(event_type, restaurant.id, entity_type, entity_id, salt)

    with transaction.atomic():
        event_log, created = WorkflowEventLog.objects.get_or_create(
            restaurant=restaurant,
            event_id=event_id,
            defaults={
                "event_type": event_type,
                "event_version": EVENT_VERSION,
                "entity_type": entity_type,
                "entity_id": str(entity_id) if entity_id else "",
                "occurred_at": occurred_at,
                "payload": payload or {},
            },
        )
        if not created:
            logger.debug("Duplicate domain event suppressed: %s (%s)", event_type, event_id)
            return None

    _dispatch_to_workflows(event_log)
    return event_log


def _dispatch_to_workflows(event_log: WorkflowEventLog) -> None:
    """Enqueue matching event workflows asynchronously."""
    from apps.workflows.models import Workflow, WorkflowStatus, WorkflowTriggerType
    from apps.workflows.services import WorkflowExecutionService

    # NOTE: filtering by event type happens in Python (instead of the JSONField
    # `contains` lookup) so the event bus also works on SQLite test databases.
    matching = [
        wf for wf in Workflow.objects.filter(
            trigger_type=WorkflowTriggerType.EVENT,
            status=WorkflowStatus.ACTIVE,
            is_deleted=False,
        )
        if event_log.event_type in (wf.trigger_config or {}).get("event_types", [])
    ]

    # Tenant scope filtering: RESTAURANT workflows only match events of their restaurant
    scoped = [
        wf for wf in matching
        if wf.scope == "GLOBAL" or wf.restaurant_id == event_log.restaurant_id
    ]

    for workflow in scoped:
        try:
            WorkflowExecutionService.start_execution(
                workflow=workflow,
                trigger="EVENT",
                input_data={
                    "event_id": event_log.event_id,
                    "event_type": event_log.event_type,
                    "event_version": event_log.event_version,
                    "restaurant_id": str(event_log.restaurant_id),
                    "entity_type": event_log.entity_type,
                    "entity_id": event_log.entity_id,
                    "occurred_at": event_log.occurred_at.isoformat(),
                    "payload": event_log.payload,
                },
                user=None,
                event_id=event_log.event_id,
            )
        except Exception as exc:
            logger.error("Failed to enqueue workflow %s for event %s: %s", workflow.code, event_log.event_id, exc)


def publish_event_via_bus(
    restaurant: Restaurant,
    event_type: str,
    entity_type: str = "",
    entity_id: Any = "",
    payload: Optional[Dict[str, Any]] = None,
    salt: str = "",
):
    """
    Import-safe facade used by domain services. Never raises - failures are
    logged so event wiring never breaks existing domain transactions.
    """
    try:
        return publish_event(
            restaurant=restaurant,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload,
            salt=salt,
        )
    except Exception as exc:
        logger.error("Event bus publication failed for %s: %s", event_type, exc)
        return None