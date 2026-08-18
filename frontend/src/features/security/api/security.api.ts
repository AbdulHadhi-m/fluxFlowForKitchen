import { apiClient } from "@/lib/api-client";
import {
  AccessReviewUser,
  DataRetentionPolicyItem,
  MFADeviceInfo,
  MFASetupResponse,
  MFAVerifyResponse,
  SecurityDashboardMetrics,
  SecurityEventItem,
  SecurityIncidentItem,
  SecurityPolicyData,
} from "../types/security.types";

export const securityApi = {
  // Dashboard
  async getDashboardMetrics(): Promise<{ success: boolean; data: SecurityDashboardMetrics }> {
    const res = await apiClient.get<{ success: boolean; data: SecurityDashboardMetrics }>("/security/dashboard/");
    return res.data;
  },

  // Events
  async getSecurityEvents(params?: {
    event_type?: string;
    severity?: string;
    search?: string;
    page?: number;
  }): Promise<{ success: boolean; data: SecurityEventItem[] }> {
    const res = await apiClient.get<{ success: boolean; data: SecurityEventItem[] }>("/security/events/", { params });
    return res.data;
  },

  // MFA
  async getMFAStatus(): Promise<{ success: boolean; data: { mfa_enabled: boolean; device: MFADeviceInfo | null } }> {
    const res = await apiClient.get<{ success: boolean; data: { mfa_enabled: boolean; device: MFADeviceInfo | null } }>("/security/mfa/status/");
    return res.data;
  },

  async setupMFA(): Promise<{ success: boolean; data: MFASetupResponse }> {
    const res = await apiClient.post<{ success: boolean; data: MFASetupResponse }>("/security/mfa/setup/", {});
    return res.data;
  },

  async verifyMFA(otp_code: string): Promise<{ success: boolean; data: MFAVerifyResponse }> {
    const res = await apiClient.post<{ success: boolean; data: MFAVerifyResponse }>("/security/mfa/verify/", { otp_code });
    return res.data;
  },

  async disableMFA(password: string): Promise<{ success: boolean; data: { message: string } }> {
    const res = await apiClient.post<{ success: boolean; data: { message: string } }>("/security/mfa/disable/", { password });
    return res.data;
  },

  // Password & Auth
  async changePassword(data: { current_password: string; new_password: string; confirm_password: string }): Promise<{ success: boolean; data: { message: string } }> {
    const res = await apiClient.post<{ success: boolean; data: { message: string } }>("/security/change-password/", data);
    return res.data;
  },

  async stepUpAuth(password: string): Promise<{ success: boolean; data: { message: string } }> {
    const res = await apiClient.post<{ success: boolean; data: { message: string } }>("/security/step-up-auth/", { password });
    return res.data;
  },

  // Policy
  async getSecurityPolicy(): Promise<{ success: boolean; data: SecurityPolicyData }> {
    const res = await apiClient.get<{ success: boolean; data: SecurityPolicyData }>("/security/policy/");
    return res.data;
  },

  async updateSecurityPolicy(data: Partial<SecurityPolicyData>): Promise<{ success: boolean; data: SecurityPolicyData }> {
    const res = await apiClient.put<{ success: boolean; data: SecurityPolicyData }>("/security/policy/", data);
    return res.data;
  },

  // Incidents
  async getIncidents(params?: { status?: string; severity?: string }): Promise<{ success: boolean; data: SecurityIncidentItem[] }> {
    const res = await apiClient.get<{ success: boolean; data: SecurityIncidentItem[] }>("/security/incidents/", { params });
    return res.data;
  },

  async createIncident(data: { title: string; description?: string; severity?: string }): Promise<{ success: boolean; data: SecurityIncidentItem }> {
    const res = await apiClient.post<{ success: boolean; data: SecurityIncidentItem }>("/security/incidents/", data);
    return res.data;
  },

  async updateIncident(
    incidentId: string,
    data: { status?: string; note?: string; assigned_to_id?: string }
  ): Promise<{ success: boolean; data: SecurityIncidentItem }> {
    const res = await apiClient.patch<{ success: boolean; data: SecurityIncidentItem }>(`/security/incidents/${incidentId}/`, data);
    return res.data;
  },

  // Admin Sessions
  async revokeUserSessions(userId: string): Promise<{ success: boolean; data: { message: string; revoked_count: number } }> {
    const res = await apiClient.post<{ success: boolean; data: { message: string; revoked_count: number } }>(
      `/security/admin/sessions/${userId}/revoke/`,
      {}
    );
    return res.data;
  },

  // Access Review
  async getAccessReview(): Promise<{ success: boolean; data: { users: AccessReviewUser[]; total_users: number } }> {
    const res = await apiClient.get<{ success: boolean; data: { users: AccessReviewUser[]; total_users: number } }>("/security/access-review/");
    return res.data;
  },

  // Data Retention
  async getRetentionPolicies(): Promise<{ success: boolean; data: DataRetentionPolicyItem[] }> {
    const res = await apiClient.get<{ success: boolean; data: DataRetentionPolicyItem[] }>("/security/retention/");
    return res.data;
  },

  async updateRetentionPolicy(data: Partial<DataRetentionPolicyItem>): Promise<{ success: boolean; data: DataRetentionPolicyItem }> {
    const res = await apiClient.post<{ success: boolean; data: DataRetentionPolicyItem }>("/security/retention/", data);
    return res.data;
  },
};
