import { apiClient } from "@/lib/api-client";
import { AuditLogItem } from "../types/audit.types";

export const auditApi = {
  async getAuditLogs(
    search?: string,
    action?: string,
    entityType?: string,
    preset?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ success: boolean; data: AuditLogItem[] }> {
    const params = {
      ...(search ? { search } : {}),
      ...(action ? { action } : {}),
      ...(entityType ? { entity_type: entityType } : {}),
      ...(preset ? { preset } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    };
    const response = await apiClient.get<{ success: boolean; data: AuditLogItem[] }>(
      "/audit-logs/",
      { params }
    );
    return response.data;
  },

  async getAuditLog(id: string): Promise<{ success: boolean; data: AuditLogItem }> {
    const response = await apiClient.get<{ success: boolean; data: AuditLogItem }>(
      `/audit-logs/${id}/`
    );
    return response.data;
  },

  async exportAuditLogs(): Promise<Blob> {
    const response = await apiClient.get("/audit-logs/export/", {
      responseType: "blob",
    });
    return response.data;
  },
};
