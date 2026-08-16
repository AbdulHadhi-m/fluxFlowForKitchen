import { apiClient } from "@/lib/api-client";
import {
  AuthResponse,
  RefreshResponse,
  User,
  UserSession,
  GenericMessageResponse,
} from "../types/auth.types";
import { LoginFormData, ForgotPasswordFormData, ResetPasswordFormData } from "../schemas/auth.schemas";

export const authApi = {
  async login(data: LoginFormData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login/", data);
    return response.data;
  },

  async refresh(): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>("/auth/refresh/", {});
    return response.data;
  },

  async logout(): Promise<GenericMessageResponse> {
    const response = await apiClient.post<GenericMessageResponse>("/auth/logout/", {});
    return response.data;
  },

  async getMe(): Promise<{ success: boolean; data: User }> {
    const response = await apiClient.get<{ success: boolean; data: User }>("/auth/me/");
    return response.data;
  },

  async getSessions(): Promise<{ success: boolean; data: UserSession[] }> {
    const response = await apiClient.get<{ success: boolean; data: UserSession[] }>("/auth/sessions/");
    return response.data;
  },

  async terminateSession(sessionId: string): Promise<GenericMessageResponse> {
    const response = await apiClient.delete<GenericMessageResponse>(`/auth/sessions/${sessionId}/`);
    return response.data;
  },

  async terminateOtherSessions(): Promise<GenericMessageResponse> {
    const response = await apiClient.delete<GenericMessageResponse>("/auth/sessions/other/");
    return response.data;
  },

  async forgotPassword(data: ForgotPasswordFormData): Promise<GenericMessageResponse> {
    const response = await apiClient.post<GenericMessageResponse>("/auth/forgot-password/", data);
    return response.data;
  },

  async resetPassword(token: string, data: ResetPasswordFormData): Promise<GenericMessageResponse> {
    const response = await apiClient.post<GenericMessageResponse>("/auth/reset-password/", {
      token,
      password: data.password,
      confirm_password: data.confirmPassword,
    });
    return response.data;
  },
};
