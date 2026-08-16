import { apiClient } from "@/lib/api-client";
import { Restaurant, RestaurantUpdatePayload, BusinessHour } from "../types/restaurant.types";

export const restaurantApi = {
  async getCurrentRestaurant(): Promise<{ success: boolean; data: Restaurant }> {
    const response = await apiClient.get<{ success: boolean; data: Restaurant }>("/restaurants/current/");
    return response.data;
  },

  async updateCurrentRestaurant(data: RestaurantUpdatePayload): Promise<{ success: boolean; data: Restaurant }> {
    const response = await apiClient.patch<{ success: boolean; data: Restaurant }>("/restaurants/current/", data);
    return response.data;
  },

  async createRestaurant(data: RestaurantUpdatePayload): Promise<{ success: boolean; data: Restaurant }> {
    const response = await apiClient.post<{ success: boolean; data: Restaurant }>("/restaurants/", data);
    return response.data;
  },

  async getBusinessHours(): Promise<{ success: boolean; data: BusinessHour[] }> {
    const response = await apiClient.get<{ success: boolean; data: BusinessHour[] }>("/restaurants/current/hours/");
    return response.data;
  },

  async updateBusinessHours(hours: BusinessHour[]): Promise<{ success: boolean; data: BusinessHour[] }> {
    const response = await apiClient.put<{ success: boolean; data: BusinessHour[] }>("/restaurants/current/hours/", hours);
    return response.data;
  },
};
