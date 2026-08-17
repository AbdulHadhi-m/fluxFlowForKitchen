from django.urls import path

from apps.workflows import views

urlpatterns = [
    path("workflows/", views.WorkflowListCreateView.as_view(), name="workflow-list-create"),
    path("workflows/<uuid:workflow_id>/", views.WorkflowDetailView.as_view(), name="workflow-detail"),
    path("workflows/<uuid:workflow_id>/validate/", views.WorkflowValidateView.as_view(), name="workflow-validate"),
    path("workflows/<uuid:workflow_id>/publish/", views.WorkflowPublishView.as_view(), name="workflow-publish"),
    path("workflows/<uuid:workflow_id>/execute/", views.WorkflowExecuteView.as_view(), name="workflow-execute"),
    path("workflows/<uuid:workflow_id>/<str:action>/", views.WorkflowStateView.as_view(), name="workflow-state"),

    path("workflow-executions/", views.WorkflowExecutionListView.as_view(), name="workflow-execution-list"),
    path("workflow-executions/<uuid:execution_id>/", views.WorkflowExecutionDetailView.as_view(), name="workflow-execution-detail"),
    path(
        "workflow-executions/<uuid:execution_id>/<str:action>/",
        views.WorkflowExecutionActionView.as_view(),
        name="workflow-execution-action",
    ),

    path("workflow-approvals/", views.WorkflowApprovalInboxView.as_view(), name="workflow-approval-inbox"),
    path(
        "workflow-approvals/<uuid:approval_id>/<str:decision>/",
        views.WorkflowApprovalRespondView.as_view(),
        name="workflow-approval-respond",
    ),

    path("workflow-templates/", views.WorkflowTemplateListView.as_view(), name="workflow-templates"),
    path("automation/analytics/", views.AutomationAnalyticsView.as_view(), name="automation-analytics"),
    path("workflow-events/", views.WorkflowEventLogListView.as_view(), name="workflow-event-log"),
    path("workflow-tasks/", views.WorkflowTaskListView.as_view(), name="workflow-task-list"),
    path("workflow-tasks/<uuid:task_id>/", views.WorkflowTaskListView.as_view(), name="workflow-task-detail"),
    path("webhook-credentials/", views.WorkflowWebhookCredentialListView.as_view(), name="webhook-credentials"),
]