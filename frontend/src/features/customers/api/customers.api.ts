import { apiClient } from "@/lib/api-client";
import {
  Customer,
  CreateCustomerPayload,
  CustomerTag,
  Reservation,
  CreateReservationPayload,
  CRMAnalytics,
} from "../types/customers.types";

export const customersApi = {
  async getCustomers(params?: { search?: string; tag?: string }): Promise<{ success: boolean; data: Customer[] }> {
    const response = await apiClient.get<{ success: boolean; data: Customer[] }>("/customers/", { params });
    return response.data;
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<{ success: boolean; data: Customer }> {
    const response = await apiClient.post<{ success: boolean; data: Customer }>("/customers/", payload);
    return response.data;
  },

  async getCustomer(id: string): Promise<{ success: boolean; data: Customer }> {
    const response = await apiClient.get<{ success: boolean; data: Customer }>(`/customers/${id}/`);
    return response.data;
  },

  async updateCustomer(id: string, payload: Partial<CreateCustomerPayload>): Promise<{ success: boolean; data: Customer }> {
    const response = await apiClient.patch<{ success: boolean; data: Customer }>(`/customers/${id}/`, payload);
    return response.data;
  },

  async mergeCustomers(primaryId: string, duplicateCustomerId: string): Promise<{ success: boolean; data: Customer }> {
    const response = await apiClient.post<{ success: boolean; data: Customer }>(`/customers/${primaryId}/merge/`, {
      duplicate_customer_id: duplicateCustomerId,
    });
    return response.data;
  },

  async getCRMAnalytics(): Promise<{ success: boolean; data: CRMAnalytics }> {
    const response = await apiClient.get<{ success: boolean; data: CRMAnalytics }>("/customers/analytics/");
    return response.data;
  },

  async getCustomerTags(): Promise<{ success: boolean; data: CustomerTag[] }> {
    const response = await apiClient.get<{ success: boolean; data: CustomerTag[] }>("/customers/tags/");
    return response.data;
  },

  async getReservations(params?: { date?: string; status?: string }): Promise<{ success: boolean; data: Reservation[] }> {
    const response = await apiClient.get<{ success: boolean; data: Reservation[] }>("/reservations/", { params });
    return response.data;
  },

  async createReservation(payload: CreateReservationPayload): Promise<{ success: boolean; data: Reservation }> {
    const response = await apiClient.post<{ success: boolean; data: Reservation }>("/reservations/", payload);
    return response.data;
  },

  async updateReservationStatus(
    id: string,
    status: string,
    cancellationReason?: string
  ): Promise<{ success: boolean; data: Reservation }> {
    const response = await apiClient.patch<{ success: boolean; data: Reservation }>(`/reservations/${id}/`, {
      status,
      cancellation_reason: cancellationReason,
    });
    return response.data;
  },
};
