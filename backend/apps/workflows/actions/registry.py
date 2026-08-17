"""
Typed action registry.

Actions are allowlisted and MUST orchestrate existing domain services.
The registry defines each action's code, name, description, input schema,
required permission, retry policy and handler. Arbitrary code execution is
impossible: users can only reference registered action codes.
"""
import logging
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger("fluxiflow.workflows.actions")


class ActionError(Exception):
    """Raised when an action handler fails for a reason unrelated to inputs."""
    def __init__(self, message: str, error_code: str = "ACTION_FAILED"):
        super().__init__(message)
        self.error_code = error_code


class ActionNotFoundError(ActionError):
    def __init__(self, code: str):
        super().__init__(f"Unknown workflow action: {code}", "ACTION_NOT_FOUND")


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 3
    delay_seconds: int = 30
    backoff_factor: float = 2.0


@dataclass(frozen=True)
class ActionDefinition:
    code: str
    name: str
    description: str
    input_schema: Dict[str, Any]
    permission: str = ""
    handler: Callable[..., Dict[str, Any]] = field(default=lambda **kw: {})
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)


class ActionRegistry:
    _registry: Dict[str, ActionDefinition] = {}

    @classmethod
    def register(cls, definition: ActionDefinition) -> None:
        if definition.code in cls._registry:
            raise ValueError(f"Duplicate action code registered: {definition.code}")
        cls._registry[definition.code] = definition

    @classmethod
    def get(cls, code: str) -> ActionDefinition:
        definition = cls._registry.get(code)
        if definition is None:
            raise ActionNotFoundError(code)
        return definition

    @classmethod
    def all(cls) -> List[ActionDefinition]:
        return sorted(cls._registry.values(), key=lambda d: d.code)

    @classmethod
    def codes(cls) -> List[str]:
        return sorted(cls._registry.keys())


# ---------------------------------------------------------------------------
# Action handlers. Each handler receives:
#   step_config  - user provided action configuration
#   context      - engine ExecutionContext (event, input, restaurant, actor, execution)
# Returns a safe metadata dict (never secrets) recorded in step output.
# ---------------------------------------------------------------------------

def _actor_for(execution):
    """Best-effort actor user for domain services (triggering user or restaurant admin)."""
    if execution.triggered_by_id:
        return execution.triggered_by
    return None


def _restaurant_admin(restaurant):
    from apps.rbac.models import TenantMembership
    membership = (
        TenantMembership.objects.filter(tenant_id=restaurant.id, is_active=True, user__is_active=True)
        .filter(_models_Q(active_role__code="RESTAURANT_ADMIN") | _models_Q(assigned_roles__code="RESTAURANT_ADMIN"))
        .select_related("user")
        .first()
    )
    return membership.user if membership else None


def _models_Q(*args, **kwargs):
    from django.db import models
    return models.Q(*args, **kwargs)


def handle_send_notification(step_config, context, execution):
    from apps.notifications.models import NotificationType, NotificationSeverity
    from apps.notifications.services import NotificationService

    restaurant = context.restaurant
    title = step_config.get("title", "Automation Alert")
    message = step_config.get("message", "")
    severity = step_config.get("severity", NotificationSeverity.INFO)
    notification_type = step_config.get("notification_type", NotificationType.SYSTEM_ALERT)
    recipient_id = step_config.get("recipient_id")
    permission_code = step_config.get("permission_code", "")
    action_url = step_config.get("action_url", "")
    entity_type = context.event.get("entity_type", "") if context.event else ""
    entity_id = context.event.get("entity_id", "") if context.event else ""

    dedup_prefix = f"wf:{execution.id}:{context.step_code}" if execution else ""

    if permission_code:
        created = NotificationService.notify_users_with_permission(
            restaurant=restaurant,
            permission_code=permission_code,
            notification_type=notification_type,
            title=title,
            message=message,
            severity=severity,
            action_url=action_url,
            entity_type=entity_type,
            entity_id=entity_id,
            deduplication_key_prefix=dedup_prefix,
        )
        return {"recipients": len(created), "target": f"permission:{permission_code}"}

    recipient = None
    if recipient_id:
        from apps.accounts.models import User
        recipient = User.objects.filter(id=recipient_id).first()
    if recipient is None:
        recipient = _actor_for(execution)
    if recipient is None:
        raise ActionError("SEND_NOTIFICATION requires recipient_id or a triggering user", "NO_RECIPIENT")

    notification = NotificationService.create_notification(
        restaurant=restaurant,
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        severity=severity,
        action_url=action_url,
        entity_type=entity_type,
        entity_id=entity_id,
        deduplication_key=f"{dedup_prefix}:{recipient.id}",
    )
    return {"recipient": str(recipient.id), "created": bool(notification)}


def handle_send_email(step_config, context, execution):
    from django.conf import settings
    from django.core.mail import send_mail

    to = step_config.get("to")
    subject = step_config.get("subject", "Fluxiflow Automation")
    body = step_config.get("body", "")
    if not to:
        raise ActionError("SEND_EMAIL requires 'to'", "NO_RECIPIENT")

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@fluxiflow.com")
    send_mail(subject=subject, message=body, from_email=from_email, recipient_list=[to], fail_silently=False)
    return {"to": to}


def handle_create_task(step_config, context, execution):
    from apps.workflows.models import WorkflowTask, WorkflowCategory
    from apps.accounts.models import User

    restaurant = context.restaurant
    assignee = None
    assignee_id = step_config.get("assignee_id")
    if assignee_id:
        assignee = User.objects.filter(id=assignee_id).first()

    task = WorkflowTask.objects.create(
        restaurant=restaurant,
        title=step_config.get("title", "Automation task"),
        description=step_config.get("description", ""),
        category=step_config.get("category", WorkflowCategory.OPERATIONS),
        priority=step_config.get("priority", WorkflowTask.TaskPriority.NORMAL),
        assignee=assignee,
        assignee_role=step_config.get("assignee_role", ""),
        due_at=context.parse_datetime(step_config.get("due_at")) if step_config.get("due_at") else None,
        execution=execution,
        entity_type=context.event.get("entity_type", "") if context.event else "",
        entity_id=context.event.get("entity_id", "") if context.event else "",
        created_by=_actor_for(execution),
    )
    return {"task_id": str(task.id), "assignee": str(assignee.id) if assignee else ""}


def handle_assign_task(step_config, context, execution):
    from apps.workflows.models import WorkflowTask
    from apps.accounts.models import User

    task_id = step_config.get("task_id")
    if not task_id:
        raise ActionError("ASSIGN_TASK requires task_id", "MISSING_TASK_ID")
    task = WorkflowTask.objects.filter(id=task_id, restaurant=context.restaurant).first()
    if task is None:
        raise ActionError(f"Task {task_id} not found", "TASK_NOT_FOUND")

    assignee = None
    assignee_id = step_config.get("assignee_id")
    if assignee_id:
        assignee = User.objects.filter(id=assignee_id).first()
    task.assignee = assignee
    task.assignee_role = step_config.get("assignee_role", task.assignee_role)
    task.status = WorkflowTask.TaskStatus.IN_PROGRESS if assignee else task.status
    task.save(update_fields=["assignee", "assignee_role", "status", "updated_at"])
    return {"task_id": str(task.id), "assignee": str(assignee.id) if assignee else ""}


def handle_create_follow_up(step_config, context, execution):
    """Creates a follow-up task due at a relative offset (e.g. 1 day after the event)."""
    from apps.workflows.models import WorkflowTask

    delay_days = int(step_config.get("days", 1))
    delay_hours = int(step_config.get("hours", 0))
    from django.utils import timezone as dj_tz
    due_at = dj_tz.now() + dj_tz.timedelta(days=delay_days, hours=delay_hours)

    task = WorkflowTask.objects.create(
        restaurant=context.restaurant,
        title=step_config.get("title", "Follow-up"),
        description=step_config.get("description", ""),
        category=step_config.get("category", "CUSTOMER"),
        priority=step_config.get("priority", WorkflowTask.TaskPriority.NORMAL),
        assignee_role=step_config.get("assignee_role", ""),
        due_at=due_at,
        execution=execution,
        entity_type=context.event.get("entity_type", "") if context.event else "",
        entity_id=context.event.get("entity_id", "") if context.event else "",
        created_by=_actor_for(execution),
    )
    return {"task_id": str(task.id), "due_at": due_at.isoformat()}


def handle_create_support_ticket(step_config, context, execution):
    """
    Creates a SUPPORT category automation task and alerts staff holding the
    configured permission. No separate support module exists; the workflow
    engine owns follow-up tasks while the actual resolution remains human work.
    """
    from apps.workflows.models import WorkflowTask, WorkflowCategory
    from apps.notifications.services import NotificationService
    from apps.notifications.models import NotificationType, NotificationSeverity

    task = WorkflowTask.objects.create(
        restaurant=context.restaurant,
        title=step_config.get("title", "Support ticket"),
        description=step_config.get("description", ""),
        category=WorkflowCategory.SUPPORT,
        priority=step_config.get("priority", WorkflowTask.TaskPriority.HIGH),
        assignee_role=step_config.get("assignee_role", "RESTAURANT_ADMIN"),
        due_at=context.parse_datetime(step_config.get("due_at")) if step_config.get("due_at") else None,
        execution=execution,
        entity_type=context.event.get("entity_type", "") if context.event else "",
        entity_id=context.event.get("entity_id", "") if context.event else "",
        created_by=_actor_for(execution),
    )

    NotificationService.notify_users_with_permission(
        restaurant=context.restaurant,
        permission_code=step_config.get("permission_code", "settings.manage"),
        notification_type=NotificationType.WORKFLOW_ACTION_FAILED,
        title="New Support Ticket (Automated)",
        message=task.title,
        severity=NotificationSeverity.WARNING,
        entity_type="WORKFLOW_TASK",
        entity_id=str(task.id),
        deduplication_key_prefix=f"wf-task:{task.id}",
    )
    return {"task_id": str(task.id)}


def handle_create_purchase_request(step_config, context, execution):
    from apps.procurement.services import PurchaseRequisitionService
    from apps.staff.models import StaffProfile

    restaurant = context.restaurant
    requester = _actor_for(execution) or _restaurant_admin(restaurant)
    if requester is None:
        staff = StaffProfile.objects.filter(restaurant=restaurant, is_active=True).select_related("user").first()
        requester = staff.user if staff else None
    if requester is None:
        raise ActionError("CREATE_PURCHASE_REQUEST requires an actor user", "NO_ACTOR")

    items_data = step_config.get("items") or []
    if not items_data:
        raise ActionError("CREATE_PURCHASE_REQUEST requires items[]", "MISSING_ITEMS")

    requisition = PurchaseRequisitionService.create_requisition(
        restaurant=restaurant,
        requester=requester,
        items_data=items_data,
        location=step_config.get("location", "KITCHEN"),
        priority=step_config.get("priority", "NORMAL"),
        reason=step_config.get("reason", "Automated by workflow"),
        notes=step_config.get("notes", ""),
    )
    return {"requisition_id": str(requisition.id), "requisition_number": requisition.requisition_number}


def handle_create_draft_purchase_order(step_config, context, execution):
    from apps.procurement.services import PurchaseOrderService
    from apps.procurement.models import Supplier

    restaurant = context.restaurant
    items_data = step_config.get("items") or []
    if not items_data:
        raise ActionError("CREATE_DRAFT_PURCHASE_ORDER requires items[]", "MISSING_ITEMS")

    supplier_id = step_config.get("supplier_id")
    supplier = None
    if supplier_id:
        supplier = Supplier.objects.filter(id=supplier_id, restaurant=restaurant).first()
    if supplier is None:
        from apps.procurement.models import SupplierItem
        first_item = items_data[0]
        item_id = first_item.get("inventory_item_id")
        if item_id:
            link = SupplierItem.objects.filter(inventory_item_id=item_id, is_active=True).select_related("supplier").first()
            supplier = link.supplier if link else None
    if supplier is None:
        raise ActionError("CREATE_DRAFT_PURCHASE_ORDER requires a supplier", "NO_SUPPLIER")

    po = PurchaseOrderService.create_purchase_order(
        restaurant=restaurant,
        supplier=supplier,
        items_data=items_data,
        created_by=_actor_for(execution),
        notes=step_config.get("notes", "Generated by workflow automation"),
    )
    return {"po_id": str(po.id), "po_number": po.po_number, "total_amount": str(po.total_amount)}


def handle_add_loyalty_points(step_config, context, execution):
    from apps.loyalty.services import LoyaltyService
    from apps.customers.models import Customer

    restaurant = context.restaurant
    customer_id = step_config.get("customer_id") or context.event.get("entity_id")
    if not customer_id:
        raise ActionError("ADD_LOYALTY_POINTS requires customer_id", "MISSING_CUSTOMER")
    customer = Customer.objects.filter(id=customer_id, restaurant=restaurant).first()
    if customer is None:
        raise ActionError(f"Customer {customer_id} not found", "CUSTOMER_NOT_FOUND")

    spend_amount = Decimal(str(step_config.get("spend_amount", "0")))
    if spend_amount <= 0:
        raise ActionError("ADD_LOYALTY_POINTS requires spend_amount > 0", "INVALID_AMOUNT")

    tx = LoyaltyService.earn_points(
        restaurant=restaurant,
        customer=customer,
        spend_amount=spend_amount,
        order_id=context.event.get("entity_id") if context.event and context.event.get("entity_type") == "ORDER" else None,
        actor_user=_actor_for(execution),
    )
    if tx is None:
        return {"awarded": False, "reason": "points already awarded or program inactive"}
    return {"awarded": True, "points": tx.points, "transaction_id": str(tx.id)}


def handle_create_coupon(step_config, context, execution):
    from apps.marketing.models import Promotion, PromotionStatus, Coupon
    from django.utils import timezone as dj_tz

    restaurant = context.restaurant
    promotion_id = step_config.get("promotion_id")
    if not promotion_id:
        raise ActionError("CREATE_COUPON requires promotion_id", "MISSING_PROMOTION")
    promotion = Promotion.objects.filter(id=promotion_id, restaurant=restaurant).first()
    if promotion is None:
        raise ActionError(f"Promotion {promotion_id} not found", "PROMOTION_NOT_FOUND")
    if promotion.status not in (PromotionStatus.ACTIVE, PromotionStatus.SCHEDULED):
        raise ActionError("Promotion must be ACTIVE or SCHEDULED", "PROMOTION_INACTIVE")

    prefix = step_config.get("prefix", "SAVE")
    code = Coupon.generate_secure_code(prefix=prefix)
    coupon = Coupon.objects.create(
        restaurant=restaurant,
        promotion=promotion,
        code=code,
        usage_limit=step_config.get("usage_limit"),
        per_customer_limit=step_config.get("per_customer_limit", 1),
        valid_from=context.parse_datetime(step_config.get("valid_from")) or dj_tz.now(),
        valid_until=context.parse_datetime(step_config.get("valid_until")),
    )
    return {"coupon_id": str(coupon.id), "code": coupon.code}


def handle_request_approval(step_config, context, execution):
    """Creates a human approval gate (also used by APPROVAL steps)."""
    from apps.workflows.services import ApprovalService

    request = ApprovalService.request_approval(
        execution=execution,
        step_code=context.step_code,
        requested_by=_actor_for(execution),
        approver_id=step_config.get("approver_id"),
        approver_role=step_config.get("approver_role", "RESTAURANT_ADMIN"),
        reason=step_config.get("reason", ""),
        amount=Decimal(str(step_config.get("amount", "0"))),
        entity_type=context.event.get("entity_type", "") if context.event else "",
        entity_id=context.event.get("entity_id", "") if context.event else "",
        related_data=step_config.get("related_data", {}),
        expiry_hours=step_config.get("expiry_hours"),
    )
    return {"approval_id": str(request.id)}


def handle_escalate(step_config, context, execution):
    from apps.notifications.services import NotificationService
    from apps.notifications.models import NotificationType, NotificationSeverity
    from apps.workflows.models import WorkflowTask

    restaurant = context.restaurant
    permission_code = step_config.get("permission_code", "settings.manage")
    title = step_config.get("title", "Escalation Required")
    message = step_config.get("message", "Workflow execution requires attention.")

    created = NotificationService.notify_users_with_permission(
        restaurant=restaurant,
        permission_code=permission_code,
        notification_type=NotificationType.WORKFLOW_APPROVAL_ESCALATED,
        title=title,
        message=message,
        severity=NotificationSeverity.CRITICAL,
        entity_type="WORKFLOW_EXECUTION",
        entity_id=str(execution.id),
        deduplication_key_prefix=f"wf-escalate:{execution.id}:{context.step_code}",
    )

    task = None
    if step_config.get("create_task", True):
        task = WorkflowTask.objects.create(
            restaurant=restaurant,
            title=f"ESCALATION: {title}",
            description=message,
            category=step_config.get("category", "OPERATIONS"),
            priority=WorkflowTask.TaskPriority.URGENT,
            assignee_role=step_config.get("assignee_role", "RESTAURANT_ADMIN"),
            execution=execution,
            entity_type="WORKFLOW_EXECUTION",
            entity_id=str(execution.id),
            created_by=_actor_for(execution),
        )
    return {"notified": len(created), "task_id": str(task.id) if task else ""}


def handle_webhook(step_config, context, execution):
    """
    Outbound webhook action. Only credential REFERENCES are stored in the
    workflow definition; secrets resolve from Django settings at call time.
    """
    import requests
    from django.conf import settings

    credential_name = step_config.get("credential_name")
    if not credential_name:
        raise ActionError("WEBHOOK requires credential_name", "MISSING_CREDENTIAL")
    from apps.workflows.models import WorkflowWebhookCredential
    credential = WorkflowWebhookCredential.objects.filter(
        restaurant=context.restaurant,
        name=credential_name,
        is_active=True,
    ).first()
    if credential is None:
        raise ActionError(f"Webhook credential '{credential_name}' not found", "CREDENTIAL_NOT_FOUND")

    credentials_store = getattr(settings, "FLUXIFLOW_WEBHOOK_CREDENTIALS", {})
    secret_config = credentials_store.get(credential.reference_key)
    if credential.auth_type in ("BEARER", "BASIC", "HMAC") and not secret_config:
        raise ActionError(f"Credential reference '{credential.reference_key}' is not configured", "CREDENTIAL_UNCONFIGURED")

    payload = dict(step_config.get("payload") or {})
    payload.setdefault("workflow_execution_id", str(execution.id))
    payload.setdefault("event", context.event or {})

    headers = {"Content-Type": "application/json", "User-Agent": "Fluxiflow-Workflow-Engine/1.0"}
    if credential.auth_type == "BEARER":
        headers["Authorization"] = f"Bearer {secret_config.get('token', '')}"
    elif credential.auth_type == "BASIC":
        import base64
        raw = f"{secret_config.get('username', '')}:{secret_config.get('password', '')}"
        headers["Authorization"] = "Basic " + base64.b64encode(raw.encode()).decode()
    elif credential.auth_type == "HMAC":
        import hashlib
        import hmac as hmac_lib
        import json
        body = json.dumps(payload, separators=(",", ":")).encode()
        signature = hmac_lib.new(
            secret_config.get("secret", "").encode(), body, hashlib.sha256
        ).hexdigest()
        headers["X-Fluxiflow-Signature"] = signature

    response = requests.post(
        credential.endpoint_url,
        json=payload,
        headers=headers,
        timeout=15,
    )
    if response.status_code >= 400:
        raise ActionError(
            f"Webhook returned HTTP {response.status_code}: {response.text[:300]}",
            "WEBHOOK_HTTP_ERROR",
        )
    return {"status_code": response.status_code, "url": credential.endpoint_url}


def _register_defaults():
    registry = ActionRegistry
    registry.register(ActionDefinition(
        code="SEND_NOTIFICATION",
        name="Send In-App Notification",
        description="Notify a specific user or all staff with a permission using the existing notification service.",
        input_schema={
            "type": "object",
            "properties": {
                "recipient_id": {"type": "string"},
                "permission_code": {"type": "string"},
                "title": {"type": "string"},
                "message": {"type": "string"},
                "severity": {"type": "string", "enum": ["INFO", "SUCCESS", "WARNING", "CRITICAL"]},
                "notification_type": {"type": "string"},
            },
        },
        permission="notifications.manage",
        handler=handle_send_notification,
    ))
    registry.register(ActionDefinition(
        code="SEND_EMAIL",
        name="Send Email",
        description="Send an email via the configured Django email backend.",
        input_schema={
            "type": "object",
            "properties": {
                "to": {"type": "string"},
                "subject": {"type": "string"},
                "body": {"type": "string"},
            },
            "required": ["to", "subject", "body"],
        },
        handler=handle_send_email,
    ))
    registry.register(ActionDefinition(
        code="CREATE_TASK",
        name="Create Task",
        description="Create an internal automation follow-up task.",
        input_schema={"type": "object"},
        permission="workflows.execute",
        handler=handle_create_task,
    ))
    registry.register(ActionDefinition(
        code="ASSIGN_TASK",
        name="Assign Task",
        description="Assign or reassign an existing automation task.",
        input_schema={"type": "object"},
        permission="workflows.execute",
        handler=handle_assign_task,
    ))
    registry.register(ActionDefinition(
        code="CREATE_FOLLOW_UP",
        name="Create Follow-up",
        description="Schedule a follow-up task relative to the current event.",
        input_schema={"type": "object"},
        permission="workflows.execute",
        handler=handle_create_follow_up,
    ))
    registry.register(ActionDefinition(
        code="CREATE_SUPPORT_TICKET",
        name="Create Support Ticket",
        description="Open an automated support ticket and alert responsible staff.",
        input_schema={"type": "object"},
        permission="workflows.execute",
        handler=handle_create_support_ticket,
    ))
    registry.register(ActionDefinition(
        code="REQUEST_APPROVAL",
        name="Request Approval",
        description="Create a human approval gate using existing RBAC.",
        input_schema={"type": "object"},
        permission="workflows.approve",
        handler=handle_request_approval,
    ))
    registry.register(ActionDefinition(
        code="CREATE_PURCHASE_REQUEST",
        name="Create Purchase Requisition",
        description="Create a purchase requisition via the existing procurement service.",
        input_schema={"type": "object"},
        permission="procurement.requisition.create",
        handler=handle_create_purchase_request,
    ))
    registry.register(ActionDefinition(
        code="CREATE_DRAFT_PURCHASE_ORDER",
        name="Create Draft Purchase Order",
        description="Create a draft purchase order via the existing procurement service.",
        input_schema={"type": "object"},
        permission="procurement.create",
        handler=handle_create_draft_purchase_order,
    ))
    registry.register(ActionDefinition(
        code="ADD_LOYALTY_POINTS",
        name="Add Loyalty Points",
        description="Award loyalty points via the existing loyalty service (idempotent per order).",
        input_schema={"type": "object"},
        permission="loyalty.adjust",
        handler=handle_add_loyalty_points,
    ))
    registry.register(ActionDefinition(
        code="CREATE_COUPON",
        name="Create Coupon",
        description="Generate a coupon code for an existing promotion.",
        input_schema={"type": "object"},
        permission="marketing.create",
        handler=handle_create_coupon,
    ))
    registry.register(ActionDefinition(
        code="ESCALATE",
        name="Escalate",
        description="Escalate to staff holding a permission and create an urgent task.",
        input_schema={"type": "object"},
        permission="workflows.execute",
        handler=handle_escalate,
    ))
    registry.register(ActionDefinition(
        code="WEBHOOK",
        name="Outbound Webhook",
        description="POST safe payload to an approved external endpoint (credential reference only).",
        input_schema={"type": "object"},
        permission="workflows.execute",
        handler=handle_webhook,
    ))


_register_defaults()