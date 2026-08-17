from decimal import Decimal
from rest_framework import serializers
from apps.workflows.models import (
    StepType,
    Workflow,
    WorkflowApprovalRequest,
    WorkflowCategory,
    WorkflowEventLog,
    WorkflowExecution,
    WorkflowScope,
    WorkflowStepExecution,
    WorkflowTask,
    WorkflowTriggerType,
    WorkflowVersion,
    WorkflowWebhookCredential,
)


class WorkflowSerializer(serializers.ModelSerializer):
    steps = serializers.JSONField(required=False, write_only=True)
    active_version_number = serializers.IntegerField(source="active_version.version_number", read_only=True, default=None)
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True, default="")
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    execution_count = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            "id", "name", "code", "description", "category", "trigger_type",
            "trigger_config", "status", "scope", "restaurant", "branch_id",
            "conditions", "active_version", "active_version_number",
            "version_count", "timeout_minutes", "max_steps", "max_retries",
            "max_nested_depth", "created_by", "updated_by", "created_at",
            "updated_at", "steps", "restaurant_name", "created_by_name",
            "updated_by_name", "execution_count",
        ]
        read_only_fields = ["id", "status", "active_version", "version_count",
                            "created_by", "updated_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj) -> str:
        if obj.created_by_id:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return ""

    def get_updated_by_name(self, obj) -> str:
        if obj.updated_by_id:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip() or obj.updated_by.email
        return ""

    def get_execution_count(self, obj) -> int:
        return getattr(obj, "execution_count", 0)


class WorkflowVersionSerializer(serializers.ModelSerializer):
    published_by_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowVersion
        fields = ["id", "workflow", "version_number", "definition", "status",
                  "changelog", "published_by", "published_by_name",
                  "published_at", "created_by", "created_at", "updated_at"]
        read_only_fields = fields

    def get_published_by_name(self, obj) -> str:
        if obj.published_by_id:
            return f"{obj.published_by.first_name} {obj.published_by.last_name}".strip() or obj.published_by.email
        return ""


class WorkflowExecutionSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source="workflow.name", read_only=True)
    workflow_code = serializers.CharField(source="workflow.code", read_only=True)
    version_number = serializers.IntegerField(source="version.version_number", read_only=True)
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True, default="")
    triggered_by_name = serializers.SerializerMethodField()
    step_executions = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowExecution
        fields = [
            "id", "workflow", "workflow_name", "workflow_code", "version",
            "version_number", "restaurant", "restaurant_name", "status",
            "trigger", "event_id", "input", "output", "error", "started_at",
            "completed_at", "current_step_code", "attempt_count",
            "scheduled_at", "resume_at", "is_paused", "parent_execution",
            "depth", "triggered_by", "triggered_by_name", "created_at",
            "updated_at", "step_executions",
        ]
        read_only_fields = fields

    def get_triggered_by_name(self, obj) -> str:
        if obj.triggered_by_id:
            return f"{obj.triggered_by.first_name} {obj.triggered_by.last_name}".strip() or obj.triggered_by.email
        return ""

    def get_step_executions(self, obj):
        steps = obj.step_executions.all().order_by("started_at", "created_at")
        return WorkflowStepExecutionSerializer(steps, many=True).data


class WorkflowStepExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowStepExecution
        fields = ["id", "execution", "step_code", "step_name", "step_type",
                  "status", "started_at", "completed_at", "duration_seconds",
                  "retry_count", "error", "output", "created_at"]
        read_only_fields = fields


class WorkflowApprovalRequestSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source="execution.workflow.name", read_only=True)
    workflow_code = serializers.CharField(source="execution.workflow.code", read_only=True)
    execution_status = serializers.CharField(source="execution.status", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    approver_name = serializers.SerializerMethodField()
    responded_by_name = serializers.SerializerMethodField()
    restaurant_id = serializers.UUIDField(source="execution.restaurant_id", read_only=True)

    class Meta:
        model = WorkflowApprovalRequest
        fields = [
            "id", "execution", "workflow_name", "workflow_code", "execution_status",
            "step_code", "requested_by", "requested_by_name", "approver",
            "approver_name", "approver_role", "reason", "amount", "entity_type",
            "entity_id", "related_data", "status", "expires_at", "responded_at",
            "responded_by", "responded_by_name", "response_note",
            "escalation_count", "escalated_at", "created_at", "updated_at",
            "restaurant_id",
        ]
        read_only_fields = fields

    def get_requested_by_name(self, obj) -> str:
        if obj.requested_by_id:
            return f"{obj.requested_by.first_name} {obj.requested_by.last_name}".strip() or obj.requested_by.email
        return ""

    def get_approver_name(self, obj) -> str:
        if obj.approver_id:
            return f"{obj.approver.first_name} {obj.approver.last_name}".strip() or obj.approver.email
        return ""

    def get_responded_by_name(self, obj) -> str:
        if obj.responded_by_id:
            return f"{obj.responded_by.first_name} {obj.responded_by.last_name}".strip() or obj.responded_by.email
        return ""


class WorkflowEventLogSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True, default="")

    class Meta:
        model = WorkflowEventLog
        fields = ["id", "event_id", "event_type", "event_version", "restaurant",
                  "restaurant_name", "entity_type", "entity_id", "occurred_at",
                  "processed_at", "created_at"]
        read_only_fields = fields


class WorkflowTaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowTask
        fields = ["id", "restaurant", "title", "description", "category", "status",
                  "priority", "assignee", "assignee_name", "assignee_role",
                  "due_at", "execution", "entity_type", "entity_id",
                  "created_by", "created_at", "updated_at"]
        read_only_fields = fields

    def get_assignee_name(self, obj) -> str:
        if obj.assignee_id:
            return f"{obj.assignee.first_name} {obj.assignee.last_name}".strip() or obj.assignee.email
        return ""


class WorkflowWebhookCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowWebhookCredential
        fields = ["id", "restaurant", "name", "reference_key", "endpoint_url",
                  "auth_type", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {"reference_key": {"help_text": "Key into FLUXIFLOW_WEBHOOK_CREDENTIALS settings. Never a raw secret."}}


class WorkflowDefinitionSerializer(serializers.Serializer):
    """Validates a workflow definition payload."""
    name = serializers.CharField(max_length=200)
    code = serializers.CharField(max_length=64)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    category = serializers.ChoiceField(choices=WorkflowCategory.choices, required=False)
    trigger_type = serializers.ChoiceField(choices=WorkflowTriggerType.choices, required=False)
    trigger_config = serializers.JSONField(required=False, default=dict)
    scope = serializers.ChoiceField(choices=WorkflowScope.choices, required=False)
    conditions = serializers.JSONField(required=False, default=dict)
    steps = serializers.JSONField(required=False, default=list)
    timeout_minutes = serializers.IntegerField(required=False, min_value=1, default=120)
    max_steps = serializers.IntegerField(required=False, min_value=1, default=50)
    max_retries = serializers.IntegerField(required=False, min_value=0, default=3)
    max_nested_depth = serializers.IntegerField(required=False, min_value=0, default=3)