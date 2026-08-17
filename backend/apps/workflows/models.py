from decimal import Decimal
from django.db import models
from django.utils import timezone
from apps.core.models import UUIDModel, TimeStampedModel, SoftDeletableModel
from apps.restaurants.models import Restaurant
from apps.accounts.models import User


class WorkflowCategory(models.TextChoices):
    INVENTORY = "INVENTORY", "Inventory & Stock"
    PROCUREMENT = "PROCUREMENT", "Procurement & Purchasing"
    FINANCE = "FINANCE", "Finance & Accounting"
    CUSTOMER = "CUSTOMER", "Customer Experience"
    SUPPORT = "SUPPORT", "Support & Service"
    HR = "HR", "Human Resources"
    MARKETING = "MARKETING", "Marketing & Campaigns"
    OPERATIONS = "OPERATIONS", "Operations"
    PAYMENT = "PAYMENT", "Payments & Billing"
    LOYALTY = "LOYALTY", "Loyalty & Rewards"
    OTHER = "OTHER", "Other"


class WorkflowStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    PAUSED = "PAUSED", "Paused"
    ARCHIVED = "ARCHIVED", "Archived"


class WorkflowTriggerType(models.TextChoices):
    EVENT = "EVENT", "Event Trigger"
    SCHEDULE = "SCHEDULE", "Schedule Trigger"
    MANUAL = "MANUAL", "Manual Trigger"
    WEBHOOK = "WEBHOOK", "Webhook Trigger"


class WorkflowScope(models.TextChoices):
    GLOBAL = "GLOBAL", "Global (All Restaurants)"
    RESTAURANT = "RESTAURANT", "Single Restaurant"


class StepType(models.TextChoices):
    ACTION = "ACTION", "Action"
    CONDITION = "CONDITION", "Condition"
    APPROVAL = "APPROVAL", "Approval"
    WAIT = "WAIT", "Wait / Delay"
    BRANCH = "BRANCH", "Branch"
    END = "END", "End"


class ExecutionStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    WAITING = "WAITING", "Waiting"
    APPROVAL_REQUIRED = "APPROVAL_REQUIRED", "Approval Required"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"
    CANCELLED = "CANCELLED", "Cancelled"
    PAUSED = "PAUSED", "Paused"


class StepExecutionStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    COMPLETED = "COMPLETED", "Completed"
    SKIPPED = "SKIPPED", "Skipped"
    FAILED = "FAILED", "Failed"
    WAITING = "WAITING", "Waiting"


class ApprovalStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    EXPIRED = "EXPIRED", "Expired"
    CANCELLED = "CANCELLED", "Cancelled"


class TriggerRecordType(models.TextChoices):
    EVENT = "EVENT", "Event"
    SCHEDULE = "SCHEDULE", "Schedule"
    MANUAL = "MANUAL", "Manual"
    WEBHOOK = "WEBHOOK", "Webhook"


class Workflow(UUIDModel, TimeStampedModel, SoftDeletableModel):
    """
    Configurable automation definition owned by a restaurant (or platform global).
    Runtime behavior lives in immutable published WorkflowVersion definitions.
    """
    name = models.CharField(max_length=200, help_text="Human readable workflow title")
    code = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Unique programmatic workflow slug within tenant scope"
    )
    description = models.TextField(blank=True, default="")
    category = models.CharField(
        max_length=30,
        choices=WorkflowCategory.choices,
        default=WorkflowCategory.OPERATIONS,
        db_index=True
    )
    trigger_type = models.CharField(
        max_length=20,
        choices=WorkflowTriggerType.choices,
        default=WorkflowTriggerType.EVENT,
        db_index=True
    )
    trigger_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Trigger configuration (event types, schedule rules, webhook config)"
    )
    status = models.CharField(
        max_length=20,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.DRAFT,
        db_index=True
    )
    scope = models.CharField(
        max_length=20,
        choices=WorkflowScope.choices,
        default=WorkflowScope.RESTAURANT
    )
    restaurant = models.ForeignKey(
        Restaurant,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="workflows",
        help_text="Tenant context (null for GLOBAL platform workflows)"
    )
    branch_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional location/outlet scope"
    )
    conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Workflow-level precondition rule group (AND/OR/NOT tree)"
    )
    active_version = models.ForeignKey(
        "WorkflowVersion",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        help_text="Currently published runtime version"
    )
    version_count = models.PositiveIntegerField(default=0)
    timeout_minutes = models.PositiveIntegerField(
        default=120,
        help_text="Maximum total execution time before timeout failure"
    )
    max_steps = models.PositiveIntegerField(
        default=50,
        help_text="Maximum step executions per run (loop protection)"
    )
    max_retries = models.PositiveIntegerField(
        default=3,
        help_text="Default maximum retry attempts per step"
    )
    max_nested_depth = models.PositiveIntegerField(
        default=3,
        help_text="Maximum nested workflow execution depth"
    )
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workflows_created"
    )
    updated_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workflows_updated"
    )

    class Meta:
        verbose_name = "Workflow"
        verbose_name_plural = "Workflows"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["code", "restaurant"],
                name="unique_workflow_code_per_restaurant",
                condition=models.Q(restaurant__isnull=False),
            ),
            models.UniqueConstraint(
                fields=["code"],
                name="unique_global_workflow_code",
                condition=models.Q(restaurant__isnull=True),
            ),
        ]
        indexes = [
            models.Index(fields=["restaurant", "status", "created_at"]),
            models.Index(fields=["restaurant", "category", "status"]),
        ]

    def __str__(self):
        return f"[{self.status}] {self.name} ({self.code})"


class WorkflowVersion(UUIDModel, TimeStampedModel):
    """
    Immutable published snapshot of a workflow definition.
    Executions always run against a frozen version.
    """
    class VersionStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        SUPERSEDED = "SUPERSEDED", "Superseded"

    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name="versions"
    )
    version_number = models.PositiveIntegerField(db_index=True)
    definition = models.JSONField(
        default=dict,
        blank=True,
        help_text="Frozen step definition: {steps: [...], conditions: {...}}"
    )
    status = models.CharField(
        max_length=20,
        choices=VersionStatus.choices,
        default=VersionStatus.DRAFT,
        db_index=True
    )
    changelog = models.TextField(blank=True, default="")
    published_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workflow_versions_published"
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workflow_versions_created"
    )

    class Meta:
        verbose_name = "Workflow Version"
        verbose_name_plural = "Workflow Versions"
        ordering = ["-version_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["workflow", "version_number"],
                name="unique_workflow_version_number"
            ),
        ]

    def __str__(self):
        return f"{self.workflow.code} v{self.version_number} [{self.status}]"


class WorkflowExecution(UUIDModel, TimeStampedModel):
    """
    Single runtime instance of a published workflow version.
    """
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name="executions"
    )
    version = models.ForeignKey(
        WorkflowVersion,
        on_delete=models.CASCADE,
        related_name="executions"
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="workflow_executions"
    )
    status = models.CharField(
        max_length=20,
        choices=ExecutionStatus.choices,
        default=ExecutionStatus.PENDING,
        db_index=True
    )
    trigger = models.CharField(
        max_length=20,
        choices=TriggerRecordType.choices,
        default=TriggerRecordType.EVENT,
        db_index=True
    )
    event_id = models.CharField(
        max_length=128,
        blank=True,
        default="",
        db_index=True,
        help_text="Originating domain event idempotency key"
    )
    input = models.JSONField(
        default=dict,
        blank=True,
        help_text="Workflow input payload (event data or manual input)"
    )
    output = models.JSONField(
        default=dict,
        blank=True,
        help_text="Collected action outputs keyed by step code"
    )
    error = models.JSONField(
        default=dict,
        blank=True,
        help_text="Failure details: {step, message, error_code, trace}"
    )
    started_at = models.DateTimeField(null=True, blank=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    current_step_code = models.CharField(max_length=64, blank=True, default="")
    attempt_count = models.PositiveIntegerField(default=0)
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    resume_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="When a WAIT step finishes, execution may resume at this timestamp"
    )
    is_paused = models.BooleanField(default=False, db_index=True)
    parent_execution = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="child_executions"
    )
    depth = models.PositiveIntegerField(default=0)
    triggered_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workflow_executions_triggered"
    )

    class Meta:
        verbose_name = "Workflow Execution"
        verbose_name_plural = "Workflow Executions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "status", "created_at"]),
            models.Index(fields=["workflow", "status"]),
            models.Index(fields=["restaurant", "scheduled_at"]),
            models.Index(fields=["version", "status"]),
        ]

    def __str__(self):
        return f"{self.workflow.code} #{self.id} [{self.status}]"


class WorkflowStepExecution(UUIDModel, TimeStampedModel):
    """
    Per-step runtime trace of an execution.
    """
    execution = models.ForeignKey(
        WorkflowExecution,
        on_delete=models.CASCADE,
        related_name="step_executions"
    )
    step_code = models.CharField(max_length=64, db_index=True)
    step_name = models.CharField(max_length=200, blank=True, default="")
    step_type = models.CharField(
        max_length=20,
        choices=StepType.choices,
        default=StepType.ACTION
    )
    status = models.CharField(
        max_length=20,
        choices=StepExecutionStatus.choices,
        default=StepExecutionStatus.PENDING,
        db_index=True
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    error = models.JSONField(
        default=dict,
        blank=True,
        help_text="{error_code, message, trace}"
    )
    output = models.JSONField(
        default=dict,
        blank=True,
        help_text="Safe action metadata (e.g. created entity id, notification count)"
    )

    class Meta:
        verbose_name = "Workflow Step Execution"
        verbose_name_plural = "Workflow Step Executions"
        ordering = ["started_at", "created_at"]
        indexes = [
            models.Index(fields=["execution", "step_code"]),
            models.Index(fields=["execution", "status"]),
        ]

    def __str__(self):
        return f"{self.execution_id} :: {self.step_code} [{self.status}]"


class WorkflowApprovalRequest(UUIDModel, TimeStampedModel):
    """
    Configurable human approval gate inside a workflow execution.
    """
    execution = models.ForeignKey(
        WorkflowExecution,
        on_delete=models.CASCADE,
        related_name="approval_requests"
    )
    step_code = models.CharField(max_length=64)
    requested_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workflow_approvals_requested"
    )
    approver = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workflow_approvals_resolved",
        help_text="Direct assignee when configured"
    )
    approver_role = models.CharField(
        max_length=64,
        blank=True,
        default="",
        help_text="RBAC role code required to approve (e.g. RESTAURANT_ADMIN)"
    )
    reason = models.TextField(blank=True, default="")
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00")
    )
    entity_type = models.CharField(max_length=64, blank=True, default="")
    entity_id = models.CharField(max_length=64, blank=True, default="")
    related_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
        db_index=True
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    responded_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workflow_approvals_responded"
    )
    response_note = models.TextField(blank=True, default="")
    escalation_count = models.PositiveIntegerField(default=0)
    escalated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Workflow Approval Request"
        verbose_name_plural = "Workflow Approval Requests"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["approver", "status"]),
            models.Index(fields=["approver_role", "status"]),
            models.Index(fields=["execution", "status"]),
        ]

    def __str__(self):
        return f"Approval {self.id} [{self.status}] for {self.execution_id}"


class WorkflowEventLog(UUIDModel, TimeStampedModel):
    """
    Append-only domain event bus record with idempotency enforcement.
    """
    event_id = models.CharField(
        max_length=128,
        db_index=True,
        help_text="Deterministic idempotency key derived from event source"
    )
    event_type = models.CharField(max_length=64, db_index=True)
    event_version = models.PositiveIntegerField(default=1)
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="workflow_event_logs"
    )
    entity_type = models.CharField(max_length=64, blank=True, default="")
    entity_id = models.CharField(max_length=64, blank=True, default="")
    occurred_at = models.DateTimeField(db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Workflow Event Log"
        verbose_name_plural = "Workflow Event Logs"
        ordering = ["-occurred_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "event_id"],
                name="unique_workflow_event_id_per_restaurant"
            ),
        ]
        indexes = [
            models.Index(fields=["restaurant", "event_type", "occurred_at"]),
            models.Index(fields=["restaurant", "entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"{self.event_type} {self.event_id}"


class WorkflowTask(UUIDModel, TimeStampedModel, SoftDeletableModel):
    """
    Lightweight automation-owned follow-up task (used by CREATE_TASK,
    ASSIGN_TASK, CREATE_FOLLOW_UP and CREATE_SUPPORT_TICKET actions).
    """
    class TaskStatus(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        DONE = "DONE", "Done"
        CANCELLED = "CANCELLED", "Cancelled"

    class TaskPriority(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="workflow_tasks"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    category = models.CharField(
        max_length=30,
        choices=WorkflowCategory.choices,
        default=WorkflowCategory.OPERATIONS
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.OPEN,
        db_index=True
    )
    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.NORMAL
    )
    assignee = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workflow_tasks"
    )
    assignee_role = models.CharField(max_length=64, blank=True, default="")
    due_at = models.DateTimeField(null=True, blank=True)
    execution = models.ForeignKey(
        WorkflowExecution,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tasks"
    )
    entity_type = models.CharField(max_length=64, blank=True, default="")
    entity_id = models.CharField(max_length=64, blank=True, default="")
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="workflow_tasks_created"
    )

    class Meta:
        verbose_name = "Workflow Task"
        verbose_name_plural = "Workflow Tasks"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "status", "due_at"]),
            models.Index(fields=["assignee", "status"]),
        ]

    def __str__(self):
        return f"[{self.status}] {self.title}"


class WorkflowWebhookCredential(UUIDModel, TimeStampedModel):
    """
    Webhook action credential REFERENCE. Secrets are never stored in the
    database - they resolve from environment-backed Django settings by key.
    """
    class AuthType(models.TextChoices):
        NONE = "NONE", "No Authentication"
        BEARER = "BEARER", "Bearer Token (env reference)"
        BASIC = "BASIC", "Basic Auth (env reference)"
        HMAC = "HMAC", "HMAC Signature (env reference)"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="workflow_webhook_credentials"
    )
    name = models.CharField(max_length=100)
    reference_key = models.CharField(
        max_length=128,
        help_text="Key into FLUXIFLOW_WEBHOOK_CREDENTIALS settings (never a raw secret)"
    )
    endpoint_url = models.URLField(
        help_text="Destination URL (no credentials allowed in URL)"
    )
    auth_type = models.CharField(
        max_length=20,
        choices=AuthType.choices,
        default=AuthType.NONE
    )
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Workflow Webhook Credential"
        verbose_name_plural = "Workflow Webhook Credentials"
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "name"],
                name="unique_webhook_credential_name_per_restaurant"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.auth_type})"