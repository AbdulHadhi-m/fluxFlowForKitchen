"""
Celery integration for the workflow engine.

Responsibilities:
  - Execute / resume workflow executions
  - Process SCHEDULE-triggered workflows
  - Resume WAITING executions
  - Expire overdue approvals and escalate
  - Detect low-stock and overdue-invoice domain events (idempotent)
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from apps.workflows.models import (
    ApprovalStatus,
    ExecutionStatus,
    Workflow,
    WorkflowExecution,
    WorkflowStatus,
    WorkflowTriggerType,
)
from apps.workflows.engine.locks import workflow_event_lock
from apps.workflows.services import ApprovalService, WorkflowExecutionService

logger = logging.getLogger("fluxiflow.workflows.tasks")


@shared_task(name="apps.workflows.tasks.run_workflow_execution", bind=True, max_retries=3, default_retry_delay=30)
def run_workflow_execution(self, execution_id: str):
    """Executes or resumes a workflow execution. Idempotent via DB row lock."""
    from apps.workflows.engine.runner import WorkflowEngine

    try:
        status = WorkflowEngine(execution_id).run()
        logger.info("Workflow execution %s finished with status %s", execution_id, status)
        return status
    except Exception as exc:
        logger.error("Workflow execution %s crashed: %s", execution_id, exc)
        try:
            execution = WorkflowExecution.objects.get(id=execution_id)
            execution.status = ExecutionStatus.FAILED
            execution.completed_at = timezone.now()
            if not execution.error:
                execution.error = {"error_code": "ENGINE_CRASH", "message": str(exc)}
            execution.save(update_fields=["status", "completed_at", "error", "updated_at"])
        except Exception:
            pass
        raise self.retry(exc=exc)


@shared_task(name="apps.workflows.tasks.resume_workflow_execution")
def resume_workflow_execution(execution_id: str):
    """Resumes an execution scheduled to wake after a WAIT step."""
    from apps.workflows.engine.runner import WorkflowEngine

    try:
        execution = WorkflowExecution.objects.get(id=execution_id)
    except WorkflowExecution.DoesNotExist:
        logger.warning("Resume target execution %s not found", execution_id)
        return "not_found"

    if execution.status != ExecutionStatus.WAITING:
        logger.info("Execution %s not waiting; skipping resume", execution_id)
        return "not_waiting"

    status = WorkflowEngine(execution_id).run()
    return status


@shared_task(name="apps.workflows.tasks.process_scheduled_workflows")
def process_scheduled_workflows():
    """
    Periodic (beat) task that launches SCHEDULE-triggered workflows whose
    next run time has arrived. Distributed locking prevents duplicate runs.
    """
    now = timezone.now()
    launched = 0

    workflows = list(
        Workflow.objects.filter(
            status=WorkflowStatus.ACTIVE,
            trigger_type=WorkflowTriggerType.SCHEDULE,
            is_deleted=False,
        )
    )

    for workflow in workflows:
        schedule = (workflow.trigger_config or {}).get("schedule") or {}
        interval = schedule.get("interval")  # e.g. "1d", "2h", "30m"
        cron = schedule.get("cron")  # optional: "0 9 * * *"

        def is_due(now_ts):
            last_run = (
                workflow.executions.filter(trigger="SCHEDULE").order_by("-started_at").first()
            )
            if interval:
                unit = interval[-1]
                amount = int(interval[:-1])
                if unit == "m":
                    interval_delta = timedelta(minutes=amount)
                elif unit == "h":
                    interval_delta = timedelta(hours=amount)
                elif unit == "d":
                    interval_delta = timedelta(days=amount)
                elif unit == "w":
                    interval_delta = timedelta(weeks=amount)
                else:
                    interval_delta = timedelta(days=1)
                if last_run and last_run.started_at and last_run.started_at + interval_delta > now_ts:
                    return False
            if cron and not _cron_due(cron, now_ts):
                return False
            return True

        if not is_due(now):
            continue

        lock_key = f"wf-schedule:{workflow.id}:{now.strftime('%Y%m%d%H%M')}"
        with workflow_event_lock(lock_key, str(workflow.restaurant_id or "global")):
            # Re-check after acquiring the lock to avoid duplicate launches
            if not is_due(now):
                continue

            try:
                input_data = {
                    "event_type": "SCHEDULE",
                    "restaurant_id": str(workflow.restaurant_id) if workflow.restaurant_id else "",
                    "trigger": "SCHEDULE",
                    "occurred_at": now.isoformat(),
                    "payload": {"workflow_code": workflow.code},
                }
                WorkflowExecutionService.start_execution(
                    workflow=workflow,
                    trigger="SCHEDULE",
                    input_data=input_data,
                )
                launched += 1
            except Exception as exc:
                logger.error("Scheduled launch failed for %s: %s", workflow.code, exc)

    return f"Launched {launched} scheduled workflows."


def _cron_due(cron: str, now) -> bool:
    """Minimal cron matcher supporting 'minute hour * * *' style expressions."""
    parts = cron.split()
    if len(parts) != 5:
        return False
    minute, hour = parts[0], parts[1]
    if minute not in ("*", str(now.minute)):
        return False
    if hour not in ("*", str(now.hour)):
        return False
    return True


@shared_task(name="apps.workflows.tasks.process_waiting_executions")
def process_waiting_executions():
    """
    Safety net for WAITING executions whose resume_at has passed but whose
    Celery eta task was lost (worker restart, queue failure).
    """
    now = timezone.now()
    overdue = list(
        WorkflowExecution.objects.filter(
            status=ExecutionStatus.WAITING,
            resume_at__isnull=False,
            resume_at__lte=now,
        )
    )
    resumed = 0
    for execution in overdue:
        try:
            WorkflowEngine = __import__("apps.workflows.engine.runner", fromlist=["WorkflowEngine"]).WorkflowEngine
            status = WorkflowEngine(str(execution.id)).run()
            if status != ExecutionStatus.WAITING:
                resumed += 1
        except Exception as exc:
            logger.error("Failed to resume waiting execution %s: %s", execution.id, exc)
    return f"Resumed {resumed} waiting executions."


@shared_task(name="apps.workflows.tasks.process_approval_deadlines")
def process_approval_deadlines():
    """Expires overdue approvals and escalates them to responsible staff."""
    expired = ApprovalService.expire_overdue()
    return f"Expired {expired} approvals."


@shared_task(name="apps.workflows.tasks.detect_low_stock_events")
def detect_low_stock_events():
    """
    Idempotent low/out-of-stock detection using the existing inventory
    reorder logic. Emits INVENTORY_LOW / INVENTORY_OUT domain events.
    """
    from apps.restaurants.models import Restaurant
    from apps.inventory.models import InventoryItem
    from apps.workflows.events import publish_event_via_bus

    emitted = 0
    restaurants = Restaurant.objects.filter(is_active=True)
    for restaurant in restaurants:
        items = InventoryItem.objects.filter(restaurant=restaurant, is_active=True)
        for item in items:
            quantity = item.current_quantity
            if quantity <= 0:
                publish_event_via_bus(
                    restaurant=restaurant,
                    event_type="INVENTORY_OUT",
                    entity_type="INVENTORY_ITEM",
                    entity_id=str(item.id),
                    payload={
                        "item_id": str(item.id),
                        "name": item.name,
                        "sku": item.sku,
                        "quantity": str(quantity),
                        "is_active": item.is_active,
                    },
                    salt="out",
                )
                emitted += 1
            elif quantity < item.par_level:
                publish_event_via_bus(
                    restaurant=restaurant,
                    event_type="INVENTORY_LOW",
                    entity_type="INVENTORY_ITEM",
                    entity_id=str(item.id),
                    payload={
                        "item_id": str(item.id),
                        "name": item.name,
                        "sku": item.sku,
                        "quantity": str(quantity),
                        "par_level": str(item.par_level),
                        "minimum_stock_level": str(item.minimum_stock_level),
                        "is_active": item.is_active,
                    },
                    salt="low",
                )
                emitted += 1
    return f"Emitted {emitted} inventory stock events."


@shared_task(name="apps.workflows.tasks.detect_overdue_invoices")
def detect_overdue_invoices():
    """
    Idempotent detection of overdue receivables emitting INVOICE_OVERDUE events.
    """
    from apps.restaurants.models import Restaurant
    from apps.finance.models import AccountsReceivable
    from apps.workflows.events import publish_event_via_bus

    emitted = 0
    now = timezone.now().date()
    for restaurant in Restaurant.objects.filter(is_active=True):
        overdue = AccountsReceivable.objects.filter(
            restaurant=restaurant,
            due_date__lt=now,
            status__in=["OPEN", "PARTIALLY_PAID", "OVERDUE"],
        )
        for ar in overdue:
            customer_name = (
                ar.customer.full_name if ar.customer_id else ""
            )
            publish_event_via_bus(
                restaurant=restaurant,
                event_type="INVOICE_OVERDUE",
                entity_type="ACCOUNTS_RECEIVABLE",
                entity_id=str(ar.id),
                payload={
                    "invoice_id": str(ar.id),
                    "invoice_number": ar.invoice_number,
                    "customer_name": customer_name,
                    "amount": str(ar.balance_due),
                    "due_date": ar.due_date.isoformat() if ar.due_date else "",
                    "days_overdue": (now - ar.due_date).days if ar.due_date else 0,
                },
                salt="overdue",
            )
            emitted += 1
    return f"Emitted {emitted} overdue invoice events."