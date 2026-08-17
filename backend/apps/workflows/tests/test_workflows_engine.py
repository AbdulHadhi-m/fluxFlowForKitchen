import pytest
from decimal import Decimal
from django.utils import timezone

from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.restaurants.services import RestaurantService
from apps.workflows.models import (
    ApprovalStatus,
    ExecutionStatus,
    Workflow,
    WorkflowCategory,
    WorkflowExecution,
    WorkflowStatus,
    WorkflowStepExecution,
    WorkflowTriggerType,
)
from apps.workflows.services import (
    ApprovalService,
    WorkflowExecutionService,
    WorkflowService,
)
from apps.workflows.engine.runner import WorkflowEngine


@pytest.fixture
def restaurant_with_user():
    from apps.rbac.services import RBACService
    RBACService.seed_system_roles_and_permissions()
    user = User.objects.create_user(email="manager@flow.com", password="Password123!")
    restaurant, _ = RestaurantService.create_restaurant(user=user, name="Flow Kitchen")
    return restaurant, user


@pytest.fixture
def published_workflow(restaurant_with_user):
    """A minimal ACTION-only workflow with a SEND_NOTIFICATION step and END."""
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Order Created Alert",
            "code": "ORDER_ALERT",
            "description": "Notify admin on order creation",
            "category": "OPERATIONS",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["ORDER_CREATED"]},
            "steps": [
                {
                    "code": "notify",
                    "name": "Notify Admin",
                    "type": "ACTION",
                    "config": {
                        "action": "SEND_NOTIFICATION",
                        "title": "New Order",
                        "message": "An order was created",
                        "severity": "INFO",
                        "permission_code": "orders.view",
                    },
                },
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "Initial publish")
    workflow = WorkflowService.activate(workflow, user)
    return workflow, restaurant, user


@pytest.mark.django_db
def test_workflow_lifecycle_create_publish_activate(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Low Stock Alert",
            "code": "LOW_STOCK_ALERT",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["INVENTORY_LOW"]},
            "steps": [
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    assert workflow.status == WorkflowStatus.DRAFT
    assert workflow.version_count == 1

    # Invalid definition (no steps) cannot be published
    draft = workflow.versions.filter(status="DRAFT").first()
    definition = dict(draft.definition or {})
    definition["steps"] = []
    draft.definition = definition
    draft.save(update_fields=["definition"])
    result = WorkflowService.validate(workflow)
    assert not result["valid"]
    with pytest.raises(Exception):
        WorkflowService.publish(workflow, user)

    # Restore steps and publish
    definition["steps"] = [{"code": "end", "name": "End", "type": "END"}]
    draft.definition = definition
    draft.save(update_fields=["definition"])

    workflow = WorkflowService.publish(workflow, user, "v1")
    assert workflow.active_version_id is not None
    assert workflow.active_version.version_number == 1

    workflow = WorkflowService.activate(workflow, user)
    assert workflow.status == WorkflowStatus.ACTIVE

    workflow = WorkflowService.pause(workflow, user)
    assert workflow.status == WorkflowStatus.PAUSED

    workflow = WorkflowService.resume(workflow, user)
    assert workflow.status == WorkflowStatus.ACTIVE

    workflow = WorkflowService.archive(workflow, user)
    assert workflow.status == WorkflowStatus.ARCHIVED


@pytest.mark.django_db
def test_event_trigger_dispatch_runs_execution(published_workflow):
    workflow, restaurant, user = published_workflow
    from apps.workflows.events import publish_event

    event_log = publish_event(
        restaurant=restaurant,
        event_type="ORDER_CREATED",
        entity_type="ORDER",
        entity_id="ord-1",
        payload={"order_id": "ord-1"},
        salt="trigger-test",
    )
    assert event_log is not None

    execution = WorkflowExecution.objects.filter(workflow=workflow).first()
    assert execution is not None
    assert execution.status == ExecutionStatus.COMPLETED
    assert "notify" in execution.output
    assert execution.output["notify"]["completed"] is True


@pytest.mark.django_db
def test_duplicate_event_is_idempotent(published_workflow):
    workflow, restaurant, user = published_workflow
    from apps.workflows.events import publish_event

    publish_event(
        restaurant=restaurant,
        event_type="ORDER_CREATED",
        entity_type="ORDER",
        entity_id="ord-2",
        payload={},
        salt="dup-test",
    )
    second = publish_event(
        restaurant=restaurant,
        event_type="ORDER_CREATED",
        entity_type="ORDER",
        entity_id="ord-2",
        payload={},
        salt="dup-test",
    )
    assert second is None
    assert WorkflowExecution.objects.filter(workflow=workflow).count() == 1


@pytest.mark.django_db
def test_workflow_level_preconditions_gate_execution(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "VIP Only",
            "code": "VIP_ONLY",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["CUSTOMER_CREATED"]},
            "conditions": {
                "operator": "AND",
                "conditions": [
                    {"field": "payload.is_vip", "operator": "EQUALS", "value": True},
                ],
            },
            "steps": [
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    from apps.workflows.events import publish_event

    publish_event(
        restaurant=restaurant,
        event_type="CUSTOMER_CREATED",
        entity_type="CUSTOMER",
        entity_id="c-1",
        payload={"is_vip": False},
        salt="precond-1",
    )
    execution = WorkflowExecution.objects.get(workflow=workflow)
    assert execution.status == ExecutionStatus.COMPLETED
    assert execution.output == {}

    publish_event(
        restaurant=restaurant,
        event_type="CUSTOMER_CREATED",
        entity_type="CUSTOMER",
        entity_id="c-2",
        payload={"is_vip": True},
        salt="precond-2",
    )
    execution2 = WorkflowExecution.objects.filter(workflow=workflow).exclude(id=execution.id).first()
    assert execution2.status == ExecutionStatus.COMPLETED


@pytest.mark.django_db
def test_condition_branch_step_jumps_to_true_target(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Branch Demo",
            "code": "BRANCH_DEMO",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["ORDER_CREATED"]},
            "steps": [
                {
                    "code": "big_order",
                    "name": "Is Big Order?",
                    "type": "CONDITION",
                    "config": {
                        "field": "payload.amount",
                        "operator": "GREATER_THAN",
                        "value": 100,
                        "true_target": "escalate",
                        "false_target": "done",
                    },
                },
                {
                    "code": "escalate",
                    "name": "Escalate",
                    "type": "ACTION",
                    "config": {
                        "action": "CREATE_TASK",
                        "title": "Big order review",
                        "priority": "HIGH",
                    },
                },
                {"code": "done", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    from apps.workflows.events import publish_event

    publish_event(
        restaurant=restaurant,
        event_type="ORDER_CREATED",
        entity_type="ORDER",
        entity_id="ord-big",
        payload={"amount": 250},
        salt="branch-1",
    )
    execution = WorkflowExecution.objects.get(workflow=workflow)
    assert execution.status == ExecutionStatus.COMPLETED
    assert "escalate" in execution.output
    from apps.workflows.models import WorkflowTask
    assert WorkflowTask.objects.filter(execution=execution, title="Big order review").exists()


@pytest.mark.django_db
def test_condition_branch_false_target_skips(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Branch Small",
            "code": "BRANCH_SMALL",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["ORDER_CREATED"]},
            "steps": [
                {
                    "code": "big_order",
                    "name": "Is Big Order?",
                    "type": "CONDITION",
                    "config": {
                        "field": "payload.amount",
                        "operator": "GREATER_THAN",
                        "value": 100,
                        "true_target": "escalate",
                        "false_target": "done",
                    },
                },
                {
                    "code": "escalate",
                    "name": "Escalate",
                    "type": "ACTION",
                    "config": {
                        "action": "CREATE_TASK",
                        "title": "Big order review",
                        "priority": "HIGH",
                    },
                },
                {"code": "done", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    from apps.workflows.events import publish_event

    publish_event(
        restaurant=restaurant,
        event_type="ORDER_CREATED",
        entity_type="ORDER",
        entity_id="ord-small",
        payload={"amount": 10},
        salt="branch-2",
    )
    execution = WorkflowExecution.objects.get(workflow=workflow)
    assert execution.status == ExecutionStatus.COMPLETED
    assert "escalate" not in execution.output


@pytest.mark.django_db
def test_approval_step_requires_approval_then_resumes(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Refund Approval",
            "code": "REFUND_APPROVAL",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["BILL_VOIDED"]},
            "steps": [
                {
                    "code": "approve",
                    "name": "Manager Approval",
                    "type": "APPROVAL",
                    "config": {
                        "approver_role": "RESTAURANT_ADMIN",
                        "reason": "Large refund",
                        "amount": 500,
                    },
                },
                {
                    "code": "notify",
                    "name": "Notify",
                    "type": "ACTION",
                    "config": {
                        "action": "CREATE_TASK",
                        "title": "Refund processed",
                    },
                },
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    from apps.workflows.events import publish_event

    publish_event(
        restaurant=restaurant,
        event_type="BILL_VOIDED",
        entity_type="BILL",
        entity_id="bill-1",
        payload={"amount": 500},
        salt="approval-1",
    )
    execution = WorkflowExecution.objects.get(workflow=workflow)
    assert execution.status == ExecutionStatus.APPROVAL_REQUIRED
    approval = execution.approval_requests.first()
    assert approval is not None
    assert approval.status == ApprovalStatus.PENDING

    # Restaurant admin (the fixture user) approves -> engine resumes automatically
    approval = ApprovalService.approve(approval, user, "Approved")
    assert approval.status == ApprovalStatus.APPROVED

    execution.refresh_from_db()
    assert execution.status == ExecutionStatus.COMPLETED
    from apps.workflows.models import WorkflowTask
    assert WorkflowTask.objects.filter(execution=execution, title="Refund processed").exists()


@pytest.mark.django_db
def test_separation_of_duties_requester_cannot_approve(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "SoD Demo",
            "code": "SOD_DEMO",
            "trigger_type": "MANUAL",
            "steps": [
                {
                    "code": "approve",
                    "name": "Approve",
                    "type": "APPROVAL",
                    "config": {"approver_role": "RESTAURANT_ADMIN"},
                },
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    execution = WorkflowExecutionService.execute_manually(workflow, user, {"note": "manual"})
    execution.refresh_from_db()
    assert execution.status == ExecutionStatus.APPROVAL_REQUIRED
    approval = execution.approval_requests.first()
    assert approval.requested_by_id == user.id

    with pytest.raises(Exception):
        ApprovalService.approve(approval, user)

    with pytest.raises(Exception):
        ApprovalService.reject(approval, user)


@pytest.mark.django_db
def test_approval_rejection_fails_execution(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Reject Demo",
            "code": "REJECT_DEMO",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["PAYMENT_COMPLETED"]},
            "steps": [
                {
                    "code": "approve",
                    "name": "Approve",
                    "type": "APPROVAL",
                    "config": {"approver_role": "RESTAURANT_ADMIN"},
                },
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    from apps.workflows.events import publish_event

    publish_event(
        restaurant=restaurant,
        event_type="PAYMENT_COMPLETED",
        entity_type="PAYMENT",
        entity_id="pay-1",
        payload={},
        salt="reject-1",
    )
    execution = WorkflowExecution.objects.get(workflow=workflow)
    approval = execution.approval_requests.first()

    approval = ApprovalService.reject(approval, user, "Not approved")
    assert approval.status == ApprovalStatus.REJECTED

    execution.refresh_from_db()
    assert execution.status == ExecutionStatus.FAILED
    assert execution.error["error_code"] == "APPROVAL_REJECTED"


@pytest.mark.django_db
def test_wait_step_pauses_then_resumes(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Wait Demo",
            "code": "WAIT_DEMO",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["ORDER_CREATED"]},
            "steps": [
                {
                    "code": "wait",
                    "name": "Wait 30s",
                    "type": "WAIT",
                    "config": {"duration_seconds": 30},
                },
                {
                    "code": "notify",
                    "name": "Notify",
                    "type": "ACTION",
                    "config": {
                        "action": "CREATE_TASK",
                        "title": "After wait task",
                    },
                },
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    from apps.workflows.events import publish_event

    publish_event(
        restaurant=restaurant,
        event_type="ORDER_CREATED",
        entity_type="ORDER",
        entity_id="ord-w",
        payload={},
        salt="wait-1",
    )
    execution = WorkflowExecution.objects.get(workflow=workflow)
    assert execution.status == ExecutionStatus.WAITING
    assert execution.resume_at is not None

    # Resume before wait expiry should keep waiting
    WorkflowEngine(str(execution.id)).run()
    execution.refresh_from_db()
    assert execution.status == ExecutionStatus.WAITING

    # Force resume past expiry
    execution.resume_at = timezone.now() - timezone.timedelta(seconds=5)
    execution.save()
    WorkflowEngine(str(execution.id)).run()
    execution.refresh_from_db()
    assert execution.status == ExecutionStatus.COMPLETED
    assert "notify" in execution.output


@pytest.mark.django_db
def test_loop_protection_detects_cycle(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Cycle Demo",
            "code": "CYCLE_DEMO",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["ORDER_CREATED"]},
            "steps": [
                {
                    "code": "a",
                    "name": "A",
                    "type": "CONDITION",
                    "config": {
                        "field": "payload.x",
                        "operator": "EQUALS",
                        "value": "loop",
                        "true_target": "b",
                        "false_target": "end",
                    },
                },
                {
                    "code": "b",
                    "name": "B",
                    "type": "CONDITION",
                    "config": {
                        "field": "payload.x",
                        "operator": "EQUALS",
                        "value": "loop",
                        "true_target": "a",
                        "false_target": "end",
                    },
                },
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    from apps.workflows.events import publish_event

    publish_event(
        restaurant=restaurant,
        event_type="ORDER_CREATED",
        entity_type="ORDER",
        entity_id="ord-c",
        payload={"x": "loop"},
        salt="cycle-1",
    )
    execution = WorkflowExecution.objects.get(workflow=workflow)
    assert execution.status == ExecutionStatus.FAILED
    assert execution.error["error_code"] == "CYCLE_DETECTED"


@pytest.mark.django_db
def test_cancel_execution_cleans_up_pending_approvals(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Cancel Demo",
            "code": "CANCEL_DEMO",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["ORDER_CREATED"]},
            "steps": [
                {
                    "code": "approve",
                    "name": "Approve",
                    "type": "APPROVAL",
                    "config": {"approver_role": "RESTAURANT_ADMIN"},
                },
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    from apps.workflows.events import publish_event

    publish_event(
        restaurant=restaurant,
        event_type="ORDER_CREATED",
        entity_type="ORDER",
        entity_id="ord-x",
        payload={},
        salt="cancel-1",
    )
    execution = WorkflowExecution.objects.get(workflow=workflow)
    assert execution.status == ExecutionStatus.APPROVAL_REQUIRED

    execution = WorkflowExecutionService.cancel(execution, user)
    assert execution.status == ExecutionStatus.CANCELLED
    approval = execution.approval_requests.first()
    assert approval.status == ApprovalStatus.CANCELLED


@pytest.mark.django_db
def test_retry_failed_execution(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Fail Demo",
            "code": "FAIL_DEMO",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["ORDER_CREATED"]},
            "steps": [
                {
                    "code": "boom",
                    "name": "Fails",
                    "type": "ACTION",
                    "config": {"action": "SEND_EMAIL", "to": "", "subject": "x", "body": "y"},
                },
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    from apps.workflows.events import publish_event

    publish_event(
        restaurant=restaurant,
        event_type="ORDER_CREATED",
        entity_type="ORDER",
        entity_id="ord-f",
        payload={},
        salt="fail-1",
    )
    execution = WorkflowExecution.objects.get(workflow=workflow)
    assert execution.status == ExecutionStatus.FAILED

    execution = WorkflowExecutionService.retry(execution, user)
    assert execution.status == ExecutionStatus.PENDING


@pytest.mark.django_db
def test_tenant_isolation_events_do_not_cross(restaurant_with_user):
    restaurant, user = restaurant_with_user
    workflow = WorkflowService.create_workflow(
        restaurant=restaurant,
        user=user,
        data={
            "name": "Isolation",
            "code": "ISOLATION",
            "trigger_type": "EVENT",
            "trigger_config": {"event_types": ["ORDER_CREATED"]},
            "steps": [
                {"code": "end", "name": "End", "type": "END"},
            ],
        },
    )
    workflow = WorkflowService.publish(workflow, user, "")
    workflow = WorkflowService.activate(workflow, user)

    other_user = User.objects.create_user(email="other@flow.com", password="Password123!")
    other_restaurant, _ = RestaurantService.create_restaurant(user=other_user, name="Other Kitchen")

    from apps.workflows.events import publish_event

    publish_event(
        restaurant=other_restaurant,
        event_type="ORDER_CREATED",
        entity_type="ORDER",
        entity_id="ord-o",
        payload={},
        salt="iso-1",
    )
    assert not WorkflowExecution.objects.filter(workflow=workflow).exists()


@pytest.mark.django_db
def test_templates_instantiate(restaurant_with_user):
    restaurant, user = restaurant_with_user
    from apps.workflows.services import WorkflowTemplateService

    templates = WorkflowTemplateService.list_templates()
    assert len(templates) >= 10
    workflow = WorkflowTemplateService.instantiate("LOW_STOCK_REORDER", restaurant, user)
    assert workflow is not None
    assert workflow.status == WorkflowStatus.DRAFT


@pytest.mark.django_db
def test_action_registry_allowlist():
    from apps.workflows.actions import ActionRegistry

    codes = ActionRegistry.codes()
    expected = {
        "SEND_NOTIFICATION", "SEND_EMAIL", "CREATE_TASK", "ASSIGN_TASK",
        "CREATE_FOLLOW_UP", "CREATE_SUPPORT_TICKET", "CREATE_PURCHASE_REQUEST",
        "CREATE_DRAFT_PURCHASE_ORDER", "ADD_LOYALTY_POINTS", "CREATE_COUPON",
        "REQUEST_APPROVAL", "ESCALATE", "WEBHOOK",
    }
    assert expected.issubset(set(codes))


@pytest.mark.django_db
def test_automation_analytics_overview(restaurant_with_user):
    restaurant, user = restaurant_with_user
    from apps.workflows.services import AutomationAnalyticsService

    data = AutomationAnalyticsService.overview(restaurant, days=30)
    assert "active_workflows" in data
    assert "executions_total" in data
    assert "success_rate" in data