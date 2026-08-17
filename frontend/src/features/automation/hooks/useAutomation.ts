import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { automationApi } from "../api/automation.api";
import { WorkflowPayload, WorkflowTask } from "../types/automation.types";

export const AUTOMATION_QUERY_KEYS = {
  workflows: ["automation", "workflows"] as const,
  workflow: (id: string) => ["automation", "workflows", id] as const,
  executions: ["automation", "executions"] as const,
  execution: (id: string) => ["automation", "executions", id] as const,
  approvals: ["automation", "approvals"] as const,
  templates: ["automation", "templates"] as const,
  analytics: ["automation", "analytics"] as const,
  eventLog: ["automation", "events"] as const,
  tasks: ["automation", "tasks"] as const,
  webhookCredentials: ["automation", "webhook-credentials"] as const,
};

export const useWorkflows = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [...AUTOMATION_QUERY_KEYS.workflows, params],
    queryFn: () => automationApi.getWorkflows(params),
  });
};

export const useWorkflow = (id: string) => {
  return useQuery({
    queryKey: AUTOMATION_QUERY_KEYS.workflow(id),
    queryFn: () => automationApi.getWorkflow(id),
    enabled: Boolean(id),
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkflowPayload) => automationApi.createWorkflow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.workflows });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.analytics });
    },
  });
};

export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<WorkflowPayload> }) =>
      automationApi.updateWorkflow(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.workflows });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.workflow(variables.id) });
    },
  });
};

export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => automationApi.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.workflows });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.analytics });
    },
  });
};

export const useValidateWorkflow = () => {
  return useMutation({
    mutationFn: (id: string) => automationApi.validateWorkflow(id),
  });
};

export const usePublishWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changelog }: { id: string; changelog?: string }) =>
      automationApi.publishWorkflow(id, changelog || ""),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.workflows });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.workflow(variables.id) });
    },
  });
};

export const useExecuteWorkflow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: Record<string, any> }) =>
      automationApi.executeWorkflow(id, input || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.executions });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.analytics });
    },
  });
};

export const useWorkflowStateAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "activate" | "pause" | "archive" | "resume" }) =>
      automationApi.workflowStateAction(id, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.workflows });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.workflow(variables.id) });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.analytics });
    },
  });
};

export const useExecutions = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [...AUTOMATION_QUERY_KEYS.executions, params],
    queryFn: () => automationApi.getExecutions(params),
  });
};

export const useExecution = (id: string) => {
  return useQuery({
    queryKey: AUTOMATION_QUERY_KEYS.execution(id),
    queryFn: () => automationApi.getExecution(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      ["RUNNING", "PENDING", "WAITING", "APPROVAL_REQUIRED"].includes(
        (query.state.data as any)?.status
      )
        ? 5000
        : false,
  });
};

export const useExecutionAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "retry" | "pause" | "resume" | "cancel" }) =>
      automationApi.executionAction(id, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.executions });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.execution(variables.id) });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.analytics });
    },
  });
};

export const useApprovals = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [...AUTOMATION_QUERY_KEYS.approvals, params],
    queryFn: () => automationApi.getApprovals(params),
    refetchInterval: 15000,
  });
};

export const useRespondApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: "approve" | "reject"; note?: string }) =>
      automationApi.respondApproval(id, decision, note || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.approvals });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.executions });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.analytics });
    },
  });
};

export const useTemplates = () => {
  return useQuery({
    queryKey: AUTOMATION_QUERY_KEYS.templates,
    queryFn: () => automationApi.getTemplates(),
  });
};

export const useCreateFromTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { code: string; name?: string; scope?: string }) =>
      automationApi.createFromTemplate(payload),
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.workflows });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.workflow(workflow.id) });
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.analytics });
    },
  });
};

export const useAutomationAnalytics = (days = 30) => {
  return useQuery({
    queryKey: [...AUTOMATION_QUERY_KEYS.analytics, days],
    queryFn: () => automationApi.getAnalytics(days),
    refetchInterval: 30000,
  });
};

export const useEventLog = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [...AUTOMATION_QUERY_KEYS.eventLog, params],
    queryFn: () => automationApi.getEventLog(params),
  });
};

export const useWorkflowTasks = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: [...AUTOMATION_QUERY_KEYS.tasks, params],
    queryFn: () => automationApi.getTasks(params),
    refetchInterval: 20000,
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Pick<WorkflowTask, "status" | "priority" | "title" | "description" | "due_at">>;
    }) => automationApi.updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.tasks });
    },
  });
};

export const useWebhookCredentials = () => {
  return useQuery({
    queryKey: AUTOMATION_QUERY_KEYS.webhookCredentials,
    queryFn: () => automationApi.getWebhookCredentials(),
  });
};

export const useCreateWebhookCredential = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      reference_key: string;
      endpoint_url: string;
      auth_type?: string;
      is_active?: boolean;
    }) => automationApi.createWebhookCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATION_QUERY_KEYS.webhookCredentials });
    },
  });
};