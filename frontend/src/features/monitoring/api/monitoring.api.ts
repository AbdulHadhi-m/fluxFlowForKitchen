import { apiClient } from "@/lib/api-client";
import {
  Alert,
  AlertRule,
  DatabaseStats,
  ErrorEvent,
  ErrorSeverity,
  ErrorStatus,
  HealthData,
  IncidentDetail,
  IncidentMetrics,
  IncidentSummary,
  IntegrationsData,
  JobsData,
  MetricsData,
  MonitoringConfig,
  MonitoringOverview,
  NotificationStats,
  ServiceSLO,
  WorkflowStats,
} from "../types/monitoring.types";

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface PaginatedEnvelope<T> {
  success: boolean;
  data: T[];
  meta: { count: number; total_pages: number; current_page: number; page_size: number };
}

export const monitoringApi = {
  async getOverview(window = 30): Promise<Envelope<MonitoringOverview>> {
    const res = await apiClient.get<Envelope<MonitoringOverview>>("/monitoring/overview/", {
      params: { window },
    });
    return res.data;
  },

  async getErrors(params?: {
    status?: string;
    severity?: string;
    module?: string;
    search?: string;
    preset?: string;
    page?: number;
  }): Promise<PaginatedEnvelope<ErrorEvent>> {
    const res = await apiClient.get<PaginatedEnvelope<ErrorEvent>>("/monitoring/errors/", {
      params,
    });
    return res.data;
  },

  async getError(id: string): Promise<Envelope<ErrorEvent>> {
    const res = await apiClient.get<Envelope<ErrorEvent>>(`/monitoring/errors/${id}/`);
    return res.data;
  },

  async updateErrorStatus(id: string, status: ErrorStatus): Promise<Envelope<ErrorEvent>> {
    const res = await apiClient.patch<Envelope<ErrorEvent>>(`/monitoring/errors/${id}/`, { status });
    return res.data;
  },

  async getMetrics(window = 30): Promise<Envelope<MetricsData>> {
    const res = await apiClient.get<Envelope<MetricsData>>("/monitoring/metrics/", {
      params: { window },
    });
    return res.data;
  },

  async getHealth(): Promise<Envelope<HealthData>> {
    const res = await apiClient.get<Envelope<HealthData>>("/monitoring/health/");
    return res.data;
  },

  async getJobs(): Promise<Envelope<JobsData>> {
    const res = await apiClient.get<Envelope<JobsData>>("/monitoring/jobs/");
    return res.data;
  },

  async getWorkflows(window = 1440): Promise<Envelope<WorkflowStats>> {
    const res = await apiClient.get<Envelope<WorkflowStats>>("/monitoring/workflows/", {
      params: { window },
    });
    return res.data;
  },

  async getNotifications(window = 1440): Promise<Envelope<NotificationStats>> {
    const res = await apiClient.get<Envelope<NotificationStats>>("/monitoring/notifications/", {
      params: { window },
    });
    return res.data;
  },

  async getIntegrations(): Promise<Envelope<IntegrationsData>> {
    const res = await apiClient.get<Envelope<IntegrationsData>>("/monitoring/integrations/");
    return res.data;
  },

  async getDatabase(): Promise<Envelope<DatabaseStats>> {
    const res = await apiClient.get<Envelope<DatabaseStats>>("/monitoring/database/");
    return res.data;
  },

  async getAlerts(params?: { status?: string; severity?: string }): Promise<Envelope<Alert[]>> {
    const res = await apiClient.get<Envelope<Alert[]>>("/monitoring/alerts/", { params });
    return res.data;
  },

  async acknowledgeAlert(id: string): Promise<Envelope<Alert>> {
    const res = await apiClient.post<Envelope<Alert>>(`/monitoring/alerts/${id}/acknowledge/`);
    return res.data;
  },

  async resolveAlert(id: string, resolution_note = ""): Promise<Envelope<Alert>> {
    const res = await apiClient.post<Envelope<Alert>>(`/monitoring/alerts/${id}/resolve/`, {
      resolution_note,
    });
    return res.data;
  },

  async getAlertRules(): Promise<Envelope<AlertRule[]>> {
    const res = await apiClient.get<Envelope<AlertRule[]>>("/monitoring/alert-rules/");
    return res.data;
  },

  async createAlertRule(payload: Partial<AlertRule>): Promise<Envelope<AlertRule>> {
    const res = await apiClient.post<Envelope<AlertRule>>("/monitoring/alert-rules/", payload);
    return res.data;
  },

  async toggleAlertRule(id: string): Promise<Envelope<AlertRule>> {
    const res = await apiClient.post<Envelope<AlertRule>>(`/monitoring/alert-rules/${id}/toggle/`);
    return res.data;
  },

  async getIncidents(params?: { status?: string; severity?: string }): Promise<
    Envelope<{ incidents: IncidentSummary[]; metrics: IncidentMetrics }>
  > {
    const res = await apiClient.get<Envelope<{ incidents: IncidentSummary[]; metrics: IncidentMetrics }>>(
      "/monitoring/incidents/",
      { params }
    );
    return res.data;
  },

  async getIncident(id: string): Promise<Envelope<IncidentDetail>> {
    const res = await apiClient.get<Envelope<IncidentDetail>>(`/monitoring/incidents/${id}/`);
    return res.data;
  },

  async acknowledgeIncident(id: string): Promise<Envelope<IncidentDetail>> {
    const res = await apiClient.post<Envelope<IncidentDetail>>(`/monitoring/incidents/${id}/acknowledge/`);
    return res.data;
  },

  async resolveIncident(id: string, notes = ""): Promise<Envelope<IncidentDetail>> {
    const res = await apiClient.post<Envelope<IncidentDetail>>(`/monitoring/incidents/${id}/resolve/`, {
      notes,
    });
    return res.data;
  },

  async addIncidentNote(id: string, text: string): Promise<Envelope<IncidentDetail>> {
    const res = await apiClient.post<Envelope<IncidentDetail>>(`/monitoring/incidents/${id}/notes/`, {
      text,
    });
    return res.data;
  },

  async getSLOs(): Promise<Envelope<ServiceSLO[]>> {
    const res = await apiClient.get<Envelope<ServiceSLO[]>>("/monitoring/slos/");
    return res.data;
  },

  async getConfig(): Promise<Envelope<MonitoringConfig>> {
    const res = await apiClient.get<Envelope<MonitoringConfig>>("/monitoring/config/");
    return res.data;
  },

  async updateConfig(payload: Partial<MonitoringConfig>): Promise<Envelope<MonitoringConfig>> {
    const res = await apiClient.patch<Envelope<MonitoringConfig>>("/monitoring/config/", payload);
    return res.data;
  },
};

export type { ErrorSeverity };