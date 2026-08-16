import { apiClient } from "@/lib/api-client";
import {
  RestaurantProfile,
  OperationalConfiguration,
  UserPreference,
} from "../types/settings.types";

export const settingsApi = {
  async getRestaurantProfile(): Promise<{ success: boolean; data: RestaurantProfile }> {
    const response = await apiClient.get<{ success: boolean; data: RestaurantProfile }>(
      "/settings/restaurant/"
    );
    return response.data;
  },

  async updateRestaurantProfile(
    payload: Partial<RestaurantProfile>
  ): Promise<{ success: boolean; data: RestaurantProfile }> {
    const response = await apiClient.patch<{ success: boolean; data: RestaurantProfile }>(
      "/settings/restaurant/",
      payload
    );
    return response.data;
  },

  async getOperationalConfiguration(): Promise<{
    success: boolean;
    data: OperationalConfiguration;
  }> {
    const response = await apiClient.get<{
      success: boolean;
      data: OperationalConfiguration;
    }>("/settings/operational/");
    return response.data;
  },

  async updateOperationalConfiguration(
    payload: Partial<OperationalConfiguration>
  ): Promise<{ success: boolean; data: OperationalConfiguration }> {
    const response = await apiClient.patch<{
      success: boolean;
      data: OperationalConfiguration;
    }>("/settings/operational/", payload);
    return response.data;
  },

  async getUserPreferences(): Promise<{ success: boolean; data: UserPreference }> {
    const response = await apiClient.get<{ success: boolean; data: UserPreference }>(
      "/settings/preferences/"
    );
    return response.data;
  },

  async updateUserPreferences(
    payload: Partial<UserPreference>
  ): Promise<{ success: boolean; data: UserPreference }> {
    const response = await apiClient.patch<{ success: boolean; data: UserPreference }>(
      "/settings/preferences/",
      payload
    );
    return response.data;
  },
};
