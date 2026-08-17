"""
Workflow execution engine.

Walks the frozen definition of a published workflow version and orchestrates
existing domain services via the allowlisted action registry. The engine is
async-friendly: WAIT, APPROVAL and retry steps return control to Celery and
are resumed later instead of blocking workers.
"""
import logging
import traceback
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from django.db import transaction
from django.utils import timezone

from apps.workflows.conditions import evaluate_condition_group
from apps.workflows.models import (
    ApprovalStatus,
    ExecutionStatus,
    StepExecutionStatus,
    StepType,
    WorkflowExecution,
    WorkflowStepExecution,
)
from apps.workflows.engine.context import ExecutionContext
from apps.workflows.engine.locks import execution_lock
from apps.workflows.actions import ActionRegistry, ActionError

logger = logging.getLogger("fluxiflow.workflows.engine")

MAX_STEP_REVISITS = 3
MAX_ACTION_RETRIES = 5


class EngineStop(Exception):
    """Signals that the engine should stop processing for this invocation."""
    def __init__(self, status: str):
        self.status = status
        super().__init__(status)


class WorkflowEngine:
    """Runs (or resumes) a workflow execution against its frozen version."""

    def __init__(self, execution_id):
        self.execution_id = execution_id

    # ------------------------------------------------------------------
    # Public entrypoint
    # ------------------------------------------------------------------
    def run(self) -> str:
        with execution_lock(self.execution_id, "") as execution:
            self._reload_and_validate(execution)
            if execution.status in (ExecutionStatus.COMPLETED, ExecutionStatus.CANCELLED, ExecutionStatus.FAILED):
                return execution.status

            if execution.status == ExecutionStatus.PENDING:
                execution.started_at = timezone.now()
                execution.status = ExecutionStatus.RUNNING
                execution.save(update_fields=["started_at", "status", "updated_at"])

            if execution.is_paused or execution.status == ExecutionStatus.PAUSED:
                execution.status = ExecutionStatus.PAUSED
                execution.save(update_fields=["status", "updated_at"])
                return ExecutionStatus.PAUSED

            if execution.status == ExecutionStatus.APPROVAL_REQUIRED:
                pending = execution.approval_requests.filter(status=ApprovalStatus.PENDING).exists()
                if pending:
                    return ExecutionStatus.APPROVAL_REQUIRED
                execution.status = ExecutionStatus.RUNNING
                execution.save(update_fields=["status", "updated_at"])

            if execution.status == ExecutionStatus.WAITING:
                if execution.resume_at and execution.resume_at > timezone.now():
                    return ExecutionStatus.WAITING
                execution.status = ExecutionStatus.RUNNING
                execution.resume_at = None
                execution.save(update_fields=["status", "resume_at", "updated_at"])

            try:
                self._check_timeout(execution)
                self._process_definition(execution)
            except EngineStop as stop:
                logger.info("Execution %s stopped with status %s", self.execution_id, stop.status)
                return stop.status
            except Exception as exc:
                self._fail_execution(execution, step_code=execution.current_step_code, exc=exc)
                return ExecutionStatus.FAILED

        return execution.status

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------
    def _reload_and_validate(self, execution: WorkflowExecution) -> None:
        execution = WorkflowExecution.objects.select_related("workflow", "version", "restaurant").get(id=execution.id)
        self.execution = execution
        if not execution.version_id:
            raise EngineStop(ExecutionStatus.FAILED)
        self.definition = execution.version.definition or {}
        self.steps: List[Dict[str, Any]] = self.definition.get("steps") or []
        if not self.steps:
            raise EngineStop(ExecutionStatus.FAILED)
        self.step_index = {step.get("code"): i for i, step in enumerate(self.steps) if step.get("code")}

    def _check_timeout(self, execution: WorkflowExecution) -> None:
        if not execution.started_at:
            return
        timeout_minutes = execution.workflow.timeout_minutes or 120
        deadline = execution.started_at + timezone.timedelta(minutes=timeout_minutes)
        if timezone.now() > deadline:
            self._fail_execution(
                execution,
                step_code=execution.current_step_code,
                error_code="EXECUTION_TIMEOUT",
                message=f"Execution exceeded timeout of {timeout_minutes} minutes",
                notify_escalation=True,
            )
            raise EngineStop(ExecutionStatus.FAILED)

    # ------------------------------------------------------------------
    # Main walk
    # ------------------------------------------------------------------
    def _process_definition(self, execution: WorkflowExecution) -> None:
        ctx = self._build_context(execution)

        # Workflow level pre-conditions
        preconditions = self.definition.get("conditions") or execution.workflow.conditions or {}
        if preconditions and not evaluate_condition_group(preconditions, ctx.to_condition_context()):
            self._complete_execution(execution, skipped_reason="workflow preconditions not met")
            return

        # Determine resume step
        start_idx = 0
        if execution.current_step_code and execution.current_step_code in self.step_index:
            start_idx = self.step_index[execution.current_step_code]
        elif execution.current_step_code:
            # Resuming after approval: step index points at the approval step
            start_idx = self.step_index.get(execution.current_step_code, 0)

        step_counts: Dict[str, int] = {}
        total_steps = 0
        max_steps = execution.workflow.max_steps or 50
        idx = start_idx

        while idx < len(self.steps):
            if execution.is_paused:
                execution.status = ExecutionStatus.PAUSED
                execution.save(update_fields=["status", "updated_at"])
                return

            step = self.steps[idx]
            step_code = str(step.get("code", ""))
            total_steps += 1
            if total_steps > max_steps:
                self._fail_execution(
                    execution,
                    step_code=step_code,
                    error_code="MAX_STEPS_EXCEEDED",
                    message=f"Execution exceeded max step count of {max_steps}",
                )
                return

            step_counts[step_code] = step_counts.get(step_code, 0) + 1
            if step_counts[step_code] > MAX_STEP_REVISITS:
                self._fail_execution(
                    execution,
                    step_code=step_code,
                    error_code="CYCLE_DETECTED",
                    message=f"Step '{step_code}' revisited {MAX_STEP_REVISITS}+ times - circular workflow path",
                )
                return

            execution.current_step_code = step_code
            execution.save(update_fields=["current_step_code", "updated_at"])

            step_type = str(step.get("type", StepType.ACTION))
            ctx.set_step(step_code, step.get("name", ""))

            # Step-level conditions (skip when false)
            step_conditions = step.get("conditions") or {}
            if step_conditions and not evaluate_condition_group(step_conditions, ctx.to_condition_context()):
                self._mark_step_skipped(execution, step)
                idx += 1
                continue

            if step_type == StepType.END:
                self._complete_execution(execution)
                return

            if step_type == StepType.ACTION:
                outcome = self._run_action_step(execution, ctx, step)
                if outcome == "retry":
                    return
                if outcome == "failed":
                    if step.get("continue_on_error"):
                        idx += 1
                        continue
                    return
                idx += 1
                continue

            if step_type == StepType.CONDITION:
                condition_spec = step.get("config") or {}
                result = evaluate_condition_group(condition_spec, ctx.to_condition_context())
                self._mark_step_completed(execution, step, {"result": result})
                target = (step.get("config") or {}).get("true_target" if result else "false_target")
                if target in self.step_index:
                    idx = self.step_index[target]
                else:
                    idx += 1
                continue

            if step_type == StepType.BRANCH:
                target = self._evaluate_branch(execution, ctx, step)
                if target in self.step_index:
                    idx = self.step_index[target]
                else:
                    idx += 1
                continue

            if step_type == StepType.WAIT:
                if self._run_wait_step(execution, ctx, step):
                    return
                idx += 1
                continue

            if step_type == StepType.APPROVAL:
                self._run_approval_step(execution, ctx, step)
                return

            logger.warning("Unknown step type %s; skipping", step_type)
            idx += 1

        # Reached end of list without END step
        self._complete_execution(execution)

    def _build_context(self, execution: WorkflowExecution) -> ExecutionContext:
        return ExecutionContext(
            execution=execution,
            restaurant=execution.restaurant,
            event=execution.input or {},
            input_data=execution.input or {},
        )

    # ------------------------------------------------------------------
    # Branch evaluation
    # ------------------------------------------------------------------
    def _evaluate_branch(self, execution: WorkflowExecution, ctx: ExecutionContext, step: Dict[str, Any]) -> Optional[str]:
        config = step.get("config") or {}
        condition_context = ctx.to_condition_context()
        selected = config.get("default_target")

        for branch in config.get("branches") or []:
            branch_condition = branch.get("condition") or {}
            if branch_condition and evaluate_condition_group(branch_condition, condition_context):
                selected = branch.get("target") or selected
                break

        self._mark_step_completed(execution, step, {"selected_target": selected})
        return selected

    # ------------------------------------------------------------------
    # Action steps
    # ------------------------------------------------------------------
    def _run_action_step(self, execution: WorkflowExecution, ctx: ExecutionContext, step: Dict[str, Any]) -> str:
        step_code = step.get("code")
        config = step.get("config") or {}
        action_code = config.get("action") or config.get("action_code")
        if not action_code:
            self._mark_step_failed(execution, step, error_code="ACTION_CODE_MISSING", message="Action step missing action code")
            return "failed" if not step.get("continue_on_error") else "continue"

        try:
            definition = ActionRegistry.get(action_code)
        except ActionError as exc:
            self._mark_step_failed(execution, step, error_code=exc.error_code, message=str(exc))
            return "failed" if not step.get("continue_on_error") else "continue"

        # Idempotency: a completed action step is never re-executed
        latest = self._latest_step_attempt(execution, step_code)
        if latest is not None and latest.status == StepExecutionStatus.COMPLETED:
            return "done"

        retry_policy = step.get("retry_policy") or {}
        max_attempts = min(
            int(retry_policy.get("max_attempts", execution.workflow.max_retries or 3)),
            MAX_ACTION_RETRIES,
        )
        if max_attempts < 1:
            max_attempts = 1

        attempt_row = None
        last_error: Optional[Exception] = None
        for attempt in range(1, max_attempts + 1):
            attempt_row = WorkflowStepExecution.objects.create(
                execution=execution,
                step_code=step_code,
                step_name=step.get("name", ""),
                step_type=StepType.ACTION,
                status=StepExecutionStatus.RUNNING,
                started_at=timezone.now(),
                retry_count=attempt - 1,
            )
            try:
                handler = definition.handler
                resolved_config = ctx.resolve_references(config)
                output = handler(step_config=resolved_config, context=ctx, execution=execution)
                safe_output = dict(output or {})
                safe_output["completed"] = True
                attempt_row.status = StepExecutionStatus.COMPLETED
                attempt_row.completed_at = timezone.now()
                attempt_row.duration_seconds = self._elapsed(attempt_row.started_at)
                attempt_row.output = safe_output
                attempt_row.save(update_fields=["status", "completed_at", "duration_seconds", "output"])
                self._store_output(execution, step_code, safe_output)
                return "done"
            except Exception as exc:
                last_error = exc
                attempt_row.status = StepExecutionStatus.FAILED
                attempt_row.completed_at = timezone.now()
                attempt_row.error = self._format_error(exc)
                attempt_row.save(update_fields=["status", "completed_at", "error", "duration_seconds"])
                logger.warning("Action %s failed (attempt %d/%d): %s", action_code, attempt, max_attempts, exc)

        # Exhausted attempts
        self._notify_action_failure(execution, step_code, last_error)
        if step.get("continue_on_error"):
            self._mark_step_failed(execution, step, error_code="ACTION_FAILED", message=str(last_error))
            return "continue"
        self._fail_execution(
            execution,
            step_code=step_code,
            error_code="ACTION_FAILED",
            message=f"Action '{action_code}' failed after {max_attempts} attempts: {last_error}",
        )
        return "failed"

    # ------------------------------------------------------------------
    # Wait steps
    # ------------------------------------------------------------------
    def _run_wait_step(self, execution: WorkflowExecution, ctx: ExecutionContext, step: Dict[str, Any]) -> bool:
        """Returns True when a new wait was scheduled (engine must stop)."""
        step_code = step.get("code")

        # Resume path: this WAIT step was already started. Mark it done and
        # continue past it instead of scheduling a second wait.
        existing = (
            WorkflowStepExecution.objects.filter(
                execution=execution,
                step_code=step_code,
                status=StepExecutionStatus.WAITING,
            )
            .order_by("-created_at")
            .first()
        )
        if existing is not None:
            existing.status = StepExecutionStatus.COMPLETED
            existing.completed_at = timezone.now()
            existing.duration_seconds = self._elapsed(existing.started_at)
            existing.save(update_fields=["status", "completed_at", "duration_seconds"])
            return False

        config = step.get("config") or {}
        duration = config.get("duration_seconds") or config.get("seconds") or 0
        resume_at = timezone.now() + timezone.timedelta(seconds=int(duration))

        wait_until = config.get("until")
        if wait_until:
            parsed = ctx.parse_datetime(wait_until)
            if parsed:
                resume_at = parsed

        step_exec = WorkflowStepExecution.objects.create(
            execution=execution,
            step_code=step_code,
            step_name=step.get("name", ""),
            step_type=StepType.WAIT,
            status=StepExecutionStatus.WAITING,
            started_at=timezone.now(),
        )
        step_exec.output = {"resume_at": resume_at.isoformat()}
        step_exec.save(update_fields=["output"])

        execution.status = ExecutionStatus.WAITING
        execution.resume_at = resume_at
        execution.save(update_fields=["status", "resume_at", "updated_at"])

        from apps.workflows.tasks import resume_workflow_execution
        resume_workflow_execution.apply_async(
            args=[str(execution.id)],
            eta=resume_at,
        )
        return True

    # ------------------------------------------------------------------
    # Approval steps
    # ------------------------------------------------------------------
    def _run_approval_step(self, execution: WorkflowExecution, ctx: ExecutionContext, step: Dict[str, Any]) -> None:
        from apps.workflows.services import ApprovalService

        config = step.get("config") or {}
        amount = Decimal(str(config.get("amount", "0")))

        request = ApprovalService.request_approval(
            execution=execution,
            step_code=step.get("code"),
            requested_by=execution.triggered_by,
            approver_id=config.get("approver_id"),
            approver_role=config.get("approver_role", "RESTAURANT_ADMIN"),
            reason=config.get("reason", ""),
            amount=amount,
            entity_type=ctx.event.get("entity_type", "") if ctx.event else "",
            entity_id=ctx.event.get("entity_id", "") if ctx.event else "",
            related_data=config.get("related_data", {}),
            expiry_hours=config.get("expiry_hours"),
        )

        WorkflowStepExecution.objects.create(
            execution=execution,
            step_code=step.get("code"),
            step_name=step.get("name", ""),
            step_type=StepType.APPROVAL,
            status=StepExecutionStatus.WAITING,
            started_at=timezone.now(),
            output={"approval_id": str(request.id), "status": ApprovalStatus.PENDING},
        )

        execution.status = ExecutionStatus.APPROVAL_REQUIRED
        execution.save(update_fields=["status", "updated_at"])

    def resume_after_approval(self, execution: WorkflowExecution, approval) -> None:
        """Called by the approval service after an approval resolves."""
        self._reload_and_validate(execution)
        step_code = approval.step_code
        step = self._find_step(step_code)
        latest = self._latest_step_attempt(execution, step_code)
        if latest:
            latest.status = StepExecutionStatus.COMPLETED if approval.status == ApprovalStatus.APPROVED else StepExecutionStatus.FAILED
            latest.completed_at = timezone.now()
            latest.output = {
                "approval_id": str(approval.id),
                "status": approval.status,
                "responded_by": str(approval.responded_by_id) if approval.responded_by_id else "",
            }
            latest.save(update_fields=["status", "completed_at", "output"])

        if approval.status != ApprovalStatus.APPROVED:
            message = f"Approval rejected by {approval.responded_by.email if approval.responded_by else 'system'}"
            if step and step.get("continue_on_error"):
                execution.status = ExecutionStatus.RUNNING
                execution.save(update_fields=["status", "updated_at"])
                return
            self._fail_execution(execution, step_code=step_code, error_code="APPROVAL_REJECTED", message=message)
            return

        # Advance past the approval step
        execution.status = ExecutionStatus.RUNNING
        next_idx = (self.step_index.get(step_code, 0) + 1) if step_code in self.step_index else 0
        next_step = self.steps[next_idx] if next_idx < len(self.steps) else None
        execution.current_step_code = next_step.get("code", "") if next_step else ""
        execution.save(update_fields=["status", "current_step_code", "updated_at"])

        from apps.workflows.tasks import run_workflow_execution
        run_workflow_execution.delay(str(execution.id))

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _find_step(self, step_code: str) -> Optional[Dict[str, Any]]:
        idx = self.step_index.get(step_code)
        return self.steps[idx] if idx is not None else None

    def _latest_step_attempt(self, execution: WorkflowExecution, step_code: str) -> Optional[WorkflowStepExecution]:
        return (
            WorkflowStepExecution.objects.filter(execution=execution, step_code=step_code)
            .order_by("-created_at")
            .first()
        )

    def _store_output(self, execution: WorkflowExecution, step_code: str, output: Dict[str, Any]) -> None:
        outputs = dict(execution.output or {})
        outputs[step_code] = output
        execution.output = outputs
        WorkflowExecution.objects.filter(id=execution.id).update(output=outputs)

    def _mark_step_completed(self, execution: WorkflowExecution, step: Dict[str, Any], output: Optional[Dict[str, Any]] = None) -> None:
        WorkflowStepExecution.objects.create(
            execution=execution,
            step_code=step.get("code"),
            step_name=step.get("name", ""),
            step_type=step.get("type", StepType.ACTION),
            status=StepExecutionStatus.COMPLETED,
            started_at=timezone.now(),
            completed_at=timezone.now(),
            output=output or {},
        )

    def _mark_step_skipped(self, execution: WorkflowExecution, step: Dict[str, Any]) -> None:
        WorkflowStepExecution.objects.create(
            execution=execution,
            step_code=step.get("code"),
            step_name=step.get("name", ""),
            step_type=step.get("type", StepType.ACTION),
            status=StepExecutionStatus.SKIPPED,
            started_at=timezone.now(),
            completed_at=timezone.now(),
        )

    def _mark_step_failed(self, execution: WorkflowExecution, step: Dict[str, Any], error_code: str, message: str) -> None:
        WorkflowStepExecution.objects.create(
            execution=execution,
            step_code=step.get("code"),
            step_name=step.get("name", ""),
            step_type=step.get("type", StepType.ACTION),
            status=StepExecutionStatus.FAILED,
            started_at=timezone.now(),
            completed_at=timezone.now(),
            error={"error_code": error_code, "message": message},
        )

    def _fail_execution(
        self,
        execution: WorkflowExecution,
        step_code: str,
        exc: Optional[Exception] = None,
        error_code: str = "EXECUTION_FAILED",
        message: str = "",
        notify_escalation: bool = False,
    ) -> None:
        error = {
            "error_code": error_code,
            "step": step_code,
            "message": message or (str(exc) if exc else "Workflow execution failed"),
        }
        if exc:
            error["trace"] = traceback.format_exc()[-2000:]
        execution.error = error
        execution.status = ExecutionStatus.FAILED
        execution.completed_at = timezone.now()
        execution.save(update_fields=["error", "status", "completed_at", "updated_at"])
        self._notify_failure(execution)
        if notify_escalation:
            self._notify_escalation(execution)

    def _complete_execution(self, execution: WorkflowExecution, skipped_reason: str = "") -> None:
        execution.status = ExecutionStatus.COMPLETED
        execution.completed_at = timezone.now()
        execution.current_step_code = ""
        execution.save(update_fields=["status", "completed_at", "current_step_code", "updated_at"])

    def _format_error(self, exc: Exception) -> Dict[str, Any]:
        code = exc.error_code if isinstance(exc, ActionError) else "ACTION_FAILED"
        return {"error_code": code, "message": str(exc)}

    @staticmethod
    def _elapsed(started_at) -> float:
        try:
            return (timezone.now() - started_at).total_seconds()
        except TypeError:
            return 0.0

    def _notify_failure(self, execution: WorkflowExecution) -> None:
        try:
            from apps.notifications.services import NotificationService
            from apps.notifications.models import NotificationType, NotificationSeverity
            NotificationService.notify_users_with_permission(
                restaurant=execution.restaurant,
                permission_code="workflows.view",
                notification_type=NotificationType.WORKFLOW_EXECUTION_FAILED,
                title="Workflow Execution Failed",
                message=f"Workflow '{execution.workflow.name}' failed at step '{execution.error.get('step', '')}': {execution.error.get('message', '')}",
                severity=NotificationSeverity.CRITICAL,
                entity_type="WORKFLOW_EXECUTION",
                entity_id=str(execution.id),
                deduplication_key_prefix=f"wf-failed:{execution.id}",
            )
        except Exception as exc:
            logger.error("Failed to notify execution failure: %s", exc)

    def _notify_action_failure(self, execution: WorkflowExecution, step_code: str, exc: Optional[Exception]) -> None:
        try:
            from apps.notifications.services import NotificationService
            from apps.notifications.models import NotificationType, NotificationSeverity
            NotificationService.notify_users_with_permission(
                restaurant=execution.restaurant,
                permission_code="workflows.view",
                notification_type=NotificationType.WORKFLOW_ACTION_FAILED,
                title="Workflow Action Failed",
                message=f"Workflow '{execution.workflow.name}' step '{step_code}' exhausted retries: {exc}",
                severity=NotificationSeverity.WARNING,
                entity_type="WORKFLOW_EXECUTION",
                entity_id=str(execution.id),
                deduplication_key_prefix=f"wf-action-failed:{execution.id}:{step_code}",
            )
        except Exception as exc2:
            logger.error("Failed to notify action failure: %s", exc2)

    def _notify_escalation(self, execution: WorkflowExecution) -> None:
        try:
            from apps.notifications.services import NotificationService
            from apps.notifications.models import NotificationType, NotificationSeverity
            NotificationService.notify_users_with_permission(
                restaurant=execution.restaurant,
                permission_code="settings.manage",
                notification_type=NotificationType.WORKFLOW_APPROVAL_ESCALATED,
                title="Workflow Execution Timed Out",
                message=f"Workflow '{execution.workflow.name}' exceeded its execution timeout.",
                severity=NotificationSeverity.CRITICAL,
                entity_type="WORKFLOW_EXECUTION",
                entity_id=str(execution.id),
                deduplication_key_prefix=f"wf-timeout:{execution.id}",
            )
        except Exception as exc:
            logger.error("Failed to notify escalation: %s", exc)