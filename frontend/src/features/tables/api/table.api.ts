import { apiClient } from "@/lib/api-client";
import {
  RestaurantTable,
  TableCreatePayload,
  TableUpdatePayload,
  TableStatus,
} from "../types/table.types";

interface PaginatedTablesResponse {
  success: boolean;
  meta: {
    count: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    next: string | null;
    previous: string | null;
  };
  data: RestaurantTable[];
}

export const tableApi = {
  async getTables(params?: {
    status?: string;
    section?: string;
    is_active?: boolean;
    search?: string;
    page?: number;
  }): Promise<PaginatedTablesResponse> {
    const response = await apiClient.get<PaginatedTablesResponse>("/tables/", { params });
    return response.data;
  },

  async getTableDetail(id: string): Promise<{ success: boolean; data: RestaurantTable }> {
    const response = await apiClient.get<{ success: boolean; data: RestaurantTable }>(`/tables/${id}/`);
    return response.data;
  },

  async createTable(data: TableCreatePayload): Promise<{ success: boolean; data: RestaurantTable }> {
    const response = await apiClient.post<{ success: boolean; data: RestaurantTable }>("/tables/", data);
    return response.data;
  },

  async updateTable(
    id: string,
    data: TableUpdatePayload
  ): Promise<{ success: boolean; data: RestaurantTable }> {
    const response = await apiClient.patch<{ success: boolean; data: RestaurantTable }>(
      `/tables/${id}/`,
      data
    );
    return response.data;
  },

  async updateTableStatus(
    id: string,
    status: TableStatus
  ): Promise<{ success: boolean; data: RestaurantTable }> {
    const response = await apiClient.patch<{ success: boolean; data: RestaurantTable }>(
      `/tables/${id}/status/`,
      { status }
    );
    return response.data;
  },

  async deleteTable(id: string): Promise<{ success: boolean; data: RestaurantTable }> {
    const response = await apiClient.delete<{ success: boolean; data: RestaurantTable }>(`/tables/${id}/`);
    return response.data;
  },
};
