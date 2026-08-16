import { apiClient } from "@/lib/api-client";
import {
  Order,
  OrderItem,
  OrderCreatePayload,
} from "../types/order.types";

interface PaginatedOrdersResponse {
  success: boolean;
  meta: {
    count: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    next: string | null;
    previous: string | null;
  };
  data: Order[];
}

export const orderApi = {
  async getOrders(params?: {
    status?: string;
    table_id?: string;
    search?: string;
    page?: number;
  }): Promise<PaginatedOrdersResponse> {
    const response = await apiClient.get<PaginatedOrdersResponse>("/orders/", { params });
    return response.data;
  },

  async getOrderDetail(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.get<{ success: boolean; data: Order }>(`/orders/${id}/`);
    return response.data;
  },

  async createOrder(data: OrderCreatePayload): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.post<{ success: boolean; data: Order }>("/orders/", data);
    return response.data;
  },

  async cancelOrder(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.post<{ success: boolean; data: Order }>(`/orders/${id}/cancel/`);
    return response.data;
  },

  async completeOrder(id: string): Promise<{ success: boolean; data: Order }> {
    const response = await apiClient.post<{ success: boolean; data: Order }>(`/orders/${id}/complete/`);
    return response.data;
  },

  async addOrderItem(
    orderId: string,
    data: { menu_item_id: string; quantity: number; notes?: string }
  ): Promise<{ success: boolean; data: OrderItem }> {
    const response = await apiClient.post<{ success: boolean; data: OrderItem }>(
      `/orders/${orderId}/items/`,
      data
    );
    return response.data;
  },

  async updateOrderItem(
    orderId: string,
    itemId: string,
    data: { quantity?: number; notes?: string }
  ): Promise<{ success: boolean; data: OrderItem }> {
    const response = await apiClient.patch<{ success: boolean; data: OrderItem }>(
      `/orders/${orderId}/items/${itemId}/`,
      data
    );
    return response.data;
  },

  async removeOrderItem(
    orderId: string,
    itemId: string
  ): Promise<{ success: boolean; data: { message: string } }> {
    const response = await apiClient.delete<{ success: boolean; data: { message: string } }>(
      `/orders/${orderId}/items/${itemId}/`
    );
    return response.data;
  },
};
