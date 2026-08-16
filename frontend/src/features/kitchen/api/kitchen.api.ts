import { apiClient } from "@/lib/api-client";
import { KitchenTicket, KitchenStatus } from "../types/kitchen.types";

export const kitchenApi = {
  async getTickets(status?: KitchenStatus | ""): Promise<{ success: boolean; data: KitchenTicket[] }> {
    const params = status ? { status } : undefined;
    const response = await apiClient.get<{ success: boolean; data: KitchenTicket[] }>("/kitchen/tickets/", {
      params,
    });
    return response.data;
  },

  async startTicket(id: string): Promise<{ success: boolean; data: KitchenTicket }> {
    const response = await apiClient.post<{ success: boolean; data: KitchenTicket }>(
      `/kitchen/tickets/${id}/start/`
    );
    return response.data;
  },

  async readyTicket(id: string): Promise<{ success: boolean; data: KitchenTicket }> {
    const response = await apiClient.post<{ success: boolean; data: KitchenTicket }>(
      `/kitchen/tickets/${id}/ready/`
    );
    return response.data;
  },

  async completeTicket(id: string): Promise<{ success: boolean; data: KitchenTicket }> {
    const response = await apiClient.post<{ success: boolean; data: KitchenTicket }>(
      `/kitchen/tickets/${id}/complete/`
    );
    return response.data;
  },

  async cancelTicket(id: string): Promise<{ success: boolean; data: KitchenTicket }> {
    const response = await apiClient.post<{ success: boolean; data: KitchenTicket }>(
      `/kitchen/tickets/${id}/cancel/`
    );
    return response.data;
  },
};
