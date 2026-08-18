import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { monitoringApi } from "../api/monitoring.api";
import { ErrorStatus } from "../types/monitoring.types";

const DEFAULT_POLL_MS = 30000;

function usePollingQuery<T>(key: string[], fetcher: () => Promise<{ success: boolean; data: T }>, enabled = true) {
  return useQuery({
    queryKey: key,
    queryFn: fetcher,
    enabled,
    refetchInterval: DEFAULT_POLL_MS,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useOverview() {
  return usePollingQuery(["monitoring", "overview"], () => monitoringApi.getOverview());
}

export function useErrors(params?: { status?: string; severity?: string; search?: string; preset?: string; page?: number }) {
  const query = useQuery({
    queryKey: ["monitoring", "errors", params],
    queryFn: () => monitoringApi.getErrors(params),
    retry: 1,
  });

  const queryClient = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ErrorStatus }) =>
      monitoringApi.updateErrorStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring", "errors"] });
      queryClient.invalidateQueries({ queryKey: ["monitoring", "overview"] });
    },
  });

  return { ...query, updateStatus };
}

export function useMetrics() {
  return usePollingQuery(["monitoring", "metrics"], () => monitoringApi.getMetrics());
}

export function useHealth() {
  return usePollingQuery(["monitoring", "health"], () => monitoringApi.getHealth(), false);
}

export function useJobs() {
  return usePollingQuery(["monitoring", "jobs"], () => monitoringApi.getJobs());
}

export function useIntegrations() {
  return usePollingQuery(["monitoring", "integrations"], () => monitoringApi.getIntegrations());
}

export function useDatabase() {
  return usePollingQuery(["monitoring", "database"], () => monitoringApi.getDatabase());
}

export function useAlerts() {
  const query = usePollingQuery(["monitoring", "alerts"], () => monitoringApi.getAlerts());
  const queryClient = useQueryClient();

  const acknowledge = useMutation({
    mutationFn: (id: string) => monitoringApi.acknowledgeAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitoring", "alerts"] }),
  });

  const resolve = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      monitoringApi.resolveAlert(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring", "alerts"] });
      queryClient.invalidateQueries({ queryKey: ["monitoring", "overview"] });
    },
  });

  return { ...query, acknowledge, resolve };
}

export function useAlertRules() {
  const query = useQuery({
    queryKey: ["monitoring", "alert-rules"],
    queryFn: () => monitoringApi.getAlertRules(),
    retry: 1,
  });
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (payload: Parameters<typeof monitoringApi.createAlertRule>[0]) =>
      monitoringApi.createAlertRule(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitoring", "alert-rules"] }),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => monitoringApi.toggleAlertRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitoring", "alert-rules"] }),
  });

  return { ...query, create, toggle };
}

export function useIncidents() {
  const query = usePollingQuery(["monitoring", "incidents"], () => monitoringApi.getIncidents());
  const queryClient = useQueryClient();

  const acknowledge = useMutation({
    mutationFn: (id: string) => monitoringApi.acknowledgeIncident(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitoring", "incidents"] }),
  });

  const resolve = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      monitoringApi.resolveIncident(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring", "incidents"] });
      queryClient.invalidateQueries({ queryKey: ["monitoring", "overview"] });
    },
  });

  const addNote = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => monitoringApi.addIncidentNote(id, text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitoring", "incidents"] }),
  });

  return { ...query, acknowledge, resolve, addNote };
}

export function useSLOs() {
  return useQuery({
    queryKey: ["monitoring", "slos"],
    queryFn: () => monitoringApi.getSLOs(),
    retry: 1,
  });
}

export function useConfig() {
  const query = useQuery({
    queryKey: ["monitoring", "config"],
    queryFn: () => monitoringApi.getConfig(),
    retry: 1,
  });
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: (payload: Parameters<typeof monitoringApi.updateConfig>[0]) =>
      monitoringApi.updateConfig(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitoring", "config"] }),
  });

  return { ...query, update };
}

export function useWorkflows() {
  return usePollingQuery(["monitoring", "workflows"], () => monitoringApi.getWorkflows());
}

export function useNotificationStats() {
  return usePollingQuery(["monitoring", "notifications"], () => monitoringApi.getNotifications());
}