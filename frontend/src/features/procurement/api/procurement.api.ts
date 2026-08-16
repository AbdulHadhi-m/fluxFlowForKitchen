import { apiClient } from "@/lib/api-client";
import {
  Supplier,
  PurchaseOrder,
  PurchaseReceipt,
  CreateSupplierPayload,
  CreatePurchaseOrderPayload,
  ReceiveGoodsPayload,
} from "../types/procurement.types";

export const procurementApi = {
  async getSuppliers(search?: string, isActive?: boolean): Promise<{ success: boolean; data: Supplier[] }> {
    const params = {
      ...(search ? { search } : {}),
      ...(isActive !== undefined ? { is_active: isActive } : {}),
    };
    const response = await apiClient.get<{ success: boolean; data: Supplier[] }>("/procurement/suppliers/", { params });
    return response.data;
  },

  async getSupplier(id: string): Promise<{ success: boolean; data: Supplier }> {
    const response = await apiClient.get<{ success: boolean; data: Supplier }>(`/procurement/suppliers/${id}/`);
    return response.data;
  },

  async createSupplier(payload: CreateSupplierPayload): Promise<{ success: boolean; data: Supplier }> {
    const response = await apiClient.post<{ success: boolean; data: Supplier }>("/procurement/suppliers/", payload);
    return response.data;
  },

  async updateSupplier(id: string, payload: Partial<CreateSupplierPayload>): Promise<{ success: boolean; data: Supplier }> {
    const response = await apiClient.patch<{ success: boolean; data: Supplier }>(`/procurement/suppliers/${id}/`, payload);
    return response.data;
  },

  async getPurchaseOrders(search?: string, status?: string, supplierId?: string): Promise<{ success: boolean; data: PurchaseOrder[] }> {
    const params = {
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(supplierId ? { supplier_id: supplierId } : {}),
    };
    const response = await apiClient.get<{ success: boolean; data: PurchaseOrder[] }>("/procurement/purchase-orders/", { params });
    return response.data;
  },

  async getPurchaseOrder(id: string): Promise<{ success: boolean; data: PurchaseOrder }> {
    const response = await apiClient.get<{ success: boolean; data: PurchaseOrder }>(`/procurement/purchase-orders/${id}/`);
    return response.data;
  },

  async createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<{ success: boolean; data: PurchaseOrder }> {
    const response = await apiClient.post<{ success: boolean; data: PurchaseOrder }>("/procurement/purchase-orders/", payload);
    return response.data;
  },

  async submitPurchaseOrder(id: string): Promise<{ success: boolean; data: PurchaseOrder }> {
    const response = await apiClient.post<{ success: boolean; data: PurchaseOrder }>(`/procurement/purchase-orders/${id}/submit/`);
    return response.data;
  },

  async approvePurchaseOrder(id: string): Promise<{ success: boolean; data: PurchaseOrder }> {
    const response = await apiClient.post<{ success: boolean; data: PurchaseOrder }>(`/procurement/purchase-orders/${id}/approve/`);
    return response.data;
  },

  async cancelPurchaseOrder(id: string, reason?: string): Promise<{ success: boolean; data: PurchaseOrder }> {
    const response = await apiClient.post<{ success: boolean; data: PurchaseOrder }>(`/procurement/purchase-orders/${id}/cancel/`, { reason });
    return response.data;
  },

  async receiveGoods(
    id: string,
    payload: ReceiveGoodsPayload
  ): Promise<{ success: boolean; data: { receipt: PurchaseReceipt; purchase_order: PurchaseOrder } }> {
    const response = await apiClient.post<{ success: boolean; data: { receipt: PurchaseReceipt; purchase_order: PurchaseOrder } }>(
      `/procurement/purchase-orders/${id}/receive/`,
      payload
    );
    return response.data;
  },
};
