import { apiClient } from "@/lib/api-client";
import {
  AutomationAnalyticsOverview,
  Workflow,
  WorkflowApprovalRequest,
  WorkflowEventLog,
  WorkflowExecution,
  WorkflowPayload,
  WorkflowTask,
  WorkflowTemplate,
  WorkflowValidationResult,
  WorkflowWebhookCredential,
} from "../types/automation.types";

const unwrap = <T>(res: any): T => res?.data?.data ?? res?.data ?? res;

export const automationApi = {
  // Workflows
  getWorkflows: async (params?: Record<string, any>): Promise<Workflow[]> => {
    const res = await apiClient.get("/workflows/", { params });
    const data = unwrap<Workflow[]>(res);
    return Array.isArray(data) ? data : [];
  },

  getWorkflow: async (id: string): Promise<Workflow> => {
    const res = await apiClient.get(`/workflows/${id}/`);
    return unwrap<Workflow>(res);
  },

  createWorkflow: async (payload: WorkflowPayload): Promise<Workflow> => {
    const res = await apiClient.post("/workflows/", payload);
    return unwrap<Workflow>(res);
  },

  updateWorkflow: async (id: string, payload: Partial<WorkflowPayload>): Promise<Workflow> => {
    const res = await apiClient.patch(`/workflows/${id}/`, payload);
    return unwrap<Workflow>(res);
  },

  deleteWorkflow: async (id: string): Promise<void> => {
    await apiClient.delete(`/workflows/${id}/`);
  },

  validateWorkflow: async (id: string): Promise<WorkflowValidationResult> => {
    const res = await apiClient.post(`/workflows/${id}/validate/`);
    return unwrap<WorkflowValidationResult>(res);
  },

  publishWorkflow: async (id: string, changelog = ""): Promise<Workflow> => {
    const res = await apiClient.post(`/workflows/${id}/publish/`, { changelog });
    return unwrap<Workflow>(res);
  },

  executeWorkflow: async (id: string, input: Record<string, any> = {}): Promise<WorkflowExecution> => {
    const res = await apiClient.post(`/workflows/${id}/execute/`, { input });
    return unwrap<WorkflowExecution>(res);
  },

  workflowStateAction: async (id: string, action: "activate" | "pause" | "archive" | "resume"): Promise<Workflow> => {
    const res = await apiClient.post(`/workflows/${id}/${action}/`);
    return unwrap<Workflow>(res);
  },

  // Executions
  getExecutions: async (params?: Record<string, any>): Promise<WorkflowExecution[]> => {
    const res = await apiClient.get("/workflow-executions/", { params });
    const data = unwrap<WorkflowExecution[]>(res);
    return Array.isArray(data) ? data : [];
  },

  getExecution: async (id: string): Promise<WorkflowExecution> => {
    const res = await apiClient.get(`/workflow-executions/${id}/`);
    return unwrap<WorkflowExecution>(res);
  },

  executionAction: async (
    id: string,
    action: "retry" | "pause" | "resume" | "cancel"
  ): Promise<WorkflowExecution> => {
    const res = await apiClient.post(`/workflow-executions/${id}/${action}/`);
    return unwrap<WorkflowExecution>(res);
  },

  // Approvals
  getApprovals: async (params?: Record<string, any>): Promise<WorkflowApprovalRequest[]> => {
    const res = await apiClient.get("/workflow-approvals/", { params });
    const data = unwrap<WorkflowApprovalRequest[]>(res);
    return Array.isArray(data) ? data : [];
  },

  respondApproval: async (
    id: string,
    decision: "approve" | "reject",
    note = ""
  ): Promise<WorkflowApprovalRequest> => {
    const res = await apiClient.post(`/workflow-approvals/${id}/${decision}/`, { note });
    return unwrap<WorkflowApprovalRequest>(res);
  },

  // Templates
  getTemplates: async (): Promise<WorkflowTemplate[]> => {
    const res = await apiClient.get("/workflow-templates/");
    const data = unwrap<WorkflowTemplate[]>(res);
    return Array.isArray(data) ? data : [];
  },

  createFromTemplate: async (payload: {
    code: string;
    name?: string;
    scope?: string;
  }): Promise<Workflow> => {
    const res = await apiClient.post("/workflow-templates/", payload);
    return unwrap<Workflow>(res);
  },

  // Analytics
  getAnalytics: async (days = 30): Promise<AutomationAnalyticsOverview> => {
    const res = await apiClient.get("/automation/analytics/", { params: { days } });
    return unwrap<AutomationAnalyticsOverview>(res);
  },

  // Event log
  getEventLog: async (params?: Record<string, any>): Promise<WorkflowEventLog[]> => {
    const res = await apiClient.get("/workflow-events/", { params });
    const data = unwrap<WorkflowEventLog[]>(res);
    return Array.isArray(data) ? data : [];
  },

  // Tasks
  getTasks: async (params?: Record<string, any>): Promise<WorkflowTask[]> => {
    const res = await apiClient.get("/workflow-tasks/", { params });
    const data = unwrap<WorkflowTask[]>(res);
    return Array.isArray(data) ? data : [];
  },

  updateTask: async (
    id: string,
    payload: Partial<Pick<WorkflowTask, "status" | "priority" | "title" | "description" | "due_at">>
  ): Promise<WorkflowTask> => {
    const res = await apiClient.patch(`/workflow-tasks/${id}/`, payload);
    return unwrap<WorkflowTask>(res);
  },

  // Webhook credentials
  getWebhookCredentials: async (): Promise<WorkflowWebhookCredential[]> => {
    const res = await apiClient.get("/webhook-credentials/");
    const data = unwrap<WorkflowWebhookCredential[]>(res);
    return Array.isArray(data) ? data : [];
  },

  createWebhookCredential: async (payload: {
    name: string;
    reference_key: string;
    endpoint_url: string;
    auth_type?: string;
    is_active?: boolean;
  }): Promise<WorkflowWebhookCredential> => {
    const res = await apiClient.post("/webhook-credentials/", payload);
    return unwrap<WorkflowWebhookCredential>(res);
  },
};