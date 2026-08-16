import { apiClient } from "@/lib/api-client";
import {
  MenuCategory,
  MenuItem,
  MenuCategoryCreatePayload,
  MenuCategoryUpdatePayload,
  MenuItemCreatePayload,
  MenuItemUpdatePayload,
} from "../types/menu.types";

interface PaginatedItemsResponse {
  success: boolean;
  meta: {
    count: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    next: string | null;
    previous: string | null;
  };
  data: MenuItem[];
}

export const menuApi = {
  // Categories
  async getCategories(params?: { is_active?: boolean }): Promise<{ success: boolean; data: MenuCategory[] }> {
    const response = await apiClient.get<{ success: boolean; data: MenuCategory[] }>("/menu/categories/", {
      params,
    });
    return response.data;
  },

  async createCategory(data: MenuCategoryCreatePayload): Promise<{ success: boolean; data: MenuCategory }> {
    const response = await apiClient.post<{ success: boolean; data: MenuCategory }>("/menu/categories/", data);
    return response.data;
  },

  async updateCategory(
    id: string,
    data: MenuCategoryUpdatePayload
  ): Promise<{ success: boolean; data: MenuCategory }> {
    const response = await apiClient.patch<{ success: boolean; data: MenuCategory }>(
      `/menu/categories/${id}/`,
      data
    );
    return response.data;
  },

  async deleteCategory(id: string): Promise<{ success: boolean; data: MenuCategory }> {
    const response = await apiClient.delete<{ success: boolean; data: MenuCategory }>(
      `/menu/categories/${id}/`
    );
    return response.data;
  },

  // Menu Items
  async getMenuItems(params?: {
    category_id?: string;
    is_available?: boolean;
    is_active?: boolean;
    search?: string;
    page?: number;
  }): Promise<PaginatedItemsResponse> {
    const response = await apiClient.get<PaginatedItemsResponse>("/menu/items/", { params });
    return response.data;
  },

  async createMenuItem(data: MenuItemCreatePayload): Promise<{ success: boolean; data: MenuItem }> {
    const response = await apiClient.post<{ success: boolean; data: MenuItem }>("/menu/items/", data);
    return response.data;
  },

  async updateMenuItem(
    id: string,
    data: MenuItemUpdatePayload
  ): Promise<{ success: boolean; data: MenuItem }> {
    const response = await apiClient.patch<{ success: boolean; data: MenuItem }>(
      `/menu/items/${id}/`,
      data
    );
    return response.data;
  },

  async setItemAvailability(
    id: string,
    is_available: boolean
  ): Promise<{ success: boolean; data: MenuItem }> {
    const response = await apiClient.patch<{ success: boolean; data: MenuItem }>(
      `/menu/items/${id}/availability/`,
      { is_available }
    );
    return response.data;
  },
};
