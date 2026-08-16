import { apiClient } from "@/lib/api-client";
import { Bill, CreateBillPayload, ProcessPaymentPayload, Payment } from "../types/billing.types";
import { Order } from "@/features/orders/types/order.types";

export const billingApi = {
  async getBills(status?: string, search?: string): Promise<{ success: boolean; data: Bill[] }> {
    const params = {
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    };
    const response = await apiClient.get<{ success: boolean; data: Bill[] }>("/billing/bills/", { params });
    return response.data;
  },

  async getBill(id: string): Promise<{ success: boolean; data: Bill }> {
    const response = await apiClient.get<{ success: boolean; data: Bill }>(`/billing/bills/${id}/`);
    return response.data;
  },

  async createBill(payload: CreateBillPayload): Promise<{ success: boolean; data: Bill }> {
    const response = await apiClient.post<{ success: boolean; data: Bill }>("/billing/bills/", payload);
    return response.data;
  },

  async processPayment(
    billId: string,
    payload: ProcessPaymentPayload
  ): Promise<{ success: boolean; data: { payment: Payment; bill: Bill } }> {
    const response = await apiClient.post<{ success: boolean; data: { payment: Payment; bill: Bill } }>(
      `/billing/bills/${billId}/payments/`,
      payload
    );
    return response.data;
  },

  async voidBill(billId: string, reason?: string): Promise<{ success: boolean; data: Bill }> {
    const response = await apiClient.post<{ success: boolean; data: Bill }>(`/billing/bills/${billId}/void/`, {
      reason,
    });
    return response.data;
  },

  async getEligibleOrders(): Promise<{ success: boolean; data: Order[] }> {
    const response = await apiClient.get<{ success: boolean; data: Order[] }>("/billing/eligible-orders/");
    return response.data;
  },
};
