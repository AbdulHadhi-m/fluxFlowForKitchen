import { apiClient } from "@/lib/api-client";
import { NotificationItem, NotificationPreference } from "../types/notifications.types";

export const notificationsApi = {
  async getNotifications(
    isRead?: boolean,
    severity?: string,
    notificationType?: string
  ): Promise<{ success: boolean; data: NotificationItem[] }> {
    const params = {
      ...(isRead !== undefined ? { is_read: isRead } : {}),
      ...(severity ? { severity } : {}),
      ...(notificationType ? { notification_type: notificationType } : {}),
    };
    const response = await apiClient.get<{ success: boolean; data: NotificationItem[] }>(
      "/notifications/",
      { params }
    );
    return response.data;
  },

  async getUnreadCount(): Promise<{ success: boolean; data: { count: number } }> {
    const response = await apiClient.get<{ success: boolean; data: { count: number } }>(
      "/notifications/unread-count/"
    );
    return response.data;
  },

  async markAsRead(id: string): Promise<{ success: boolean; data: NotificationItem }> {
    const response = await apiClient.post<{ success: boolean; data: NotificationItem }>(
      `/notifications/${id}/read/`
    );
    return response.data;
  },

  async markAllAsRead(): Promise<{ success: boolean; data: { updated_count: number } }> {
    const response = await apiClient.post<{ success: boolean; data: { updated_count: number } }>(
      "/notifications/read-all/"
    );
    return response.data;
  },

  async getPreferences(): Promise<{ success: boolean; data: NotificationPreference }> {
    const response = await apiClient.get<{ success: boolean; data: NotificationPreference }>(
      "/notifications/preferences/"
    );
    return response.data;
  },

  async updatePreferences(
    payload: Partial<NotificationPreference>
  ): Promise<{ success: boolean; data: NotificationPreference }> {
    const response = await apiClient.patch<{ success: boolean; data: NotificationPreference }>(
      "/notifications/preferences/",
      payload
    );
    return response.data;
  },
};
