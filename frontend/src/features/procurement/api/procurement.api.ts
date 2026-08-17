import { apiClient } from "@/lib/api-client";
import {
  Supplier,
  SupplierContact,
  SupplierItem,
  SupplierScorecard,
  PurchaseRequisition,
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseReturn,
  SupplierCredit,
  SupplierInvoice,
  ProcurementBudget,
  PurchaseRecommendation,
  ProcurementReports,
} from "../types/procurement.types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, any>;
}

export const procurementApi = {
  // --- Suppliers Master ---
  getSuppliers: async (params?: { search?: string; is_active?: boolean; supplier_type?: string }): Promise<Supplier[]> => {
    const res = await apiClient.get<ApiResponse<Supplier[]>>("/procurement/suppliers/", { params });
    return res.data.data;
  },

  createSupplier: async (data: Partial<Supplier>): Promise<Supplier> => {
    const res = await apiClient.post<ApiResponse<Supplier>>("/procurement/suppliers/", data);
    return res.data.data;
  },

  getSupplierDetail: async (supplierId: string): Promise<Supplier> => {
    const res = await apiClient.get<ApiResponse<Supplier>>(`/procurement/suppliers/${supplierId}/`);
    return res.data.data;
  },

  updateSupplier: async (supplierId: string, data: Partial<Supplier>): Promise<Supplier> => {
    const res = await apiClient.patch<ApiResponse<Supplier>>(`/procurement/suppliers/${supplierId}/`, data);
    return res.data.data;
  },

  addSupplierContact: async (supplierId: string, data: Partial<SupplierContact>): Promise<SupplierContact> => {
    const res = await apiClient.post<ApiResponse<SupplierContact>>(`/procurement/suppliers/${supplierId}/contacts/`, data);
    return res.data.data;
  },

  getSupplierItems: async (supplierId: string): Promise<SupplierItem[]> => {
    const res = await apiClient.get<ApiResponse<SupplierItem[]>>(`/procurement/suppliers/${supplierId}/items/`);
    return res.data.data;
  },

  upsertSupplierItem: async (supplierId: string, data: Partial<SupplierItem>): Promise<SupplierItem> => {
    const res = await apiClient.post<ApiResponse<SupplierItem>>(`/procurement/suppliers/${supplierId}/items/`, data);
    return res.data.data;
  },

  getSupplierScorecard: async (supplierId: string): Promise<SupplierScorecard> => {
    const res = await apiClient.get<ApiResponse<SupplierScorecard>>(`/procurement/suppliers/${supplierId}/performance/`);
    return res.data.data;
  },

  // --- Purchase Requisitions ---
  getRequisitions: async (params?: { status?: string; priority?: string }): Promise<PurchaseRequisition[]> => {
    const res = await apiClient.get<ApiResponse<PurchaseRequisition[]>>("/procurement/requisitions/", { params });
    return res.data.data;
  },

  createRequisition: async (data: {
    items: Array<{ inventory_item_id: string; quantity: string; unit?: string; estimated_unit_cost?: string; notes?: string }>;
    location?: string;
    priority?: string;
    reason?: string;
    notes?: string;
  }): Promise<PurchaseRequisition> => {
    const res = await apiClient.post<ApiResponse<PurchaseRequisition>>("/procurement/requisitions/", data);
    return res.data.data;
  },

  submitRequisition: async (requisitionId: string): Promise<PurchaseRequisition> => {
    const res = await apiClient.post<ApiResponse<PurchaseRequisition>>(`/procurement/requisitions/${requisitionId}/submit/`);
    return res.data.data;
  },

  approveRequisition: async (requisitionId: string): Promise<PurchaseRequisition> => {
    const res = await apiClient.post<ApiResponse<PurchaseRequisition>>(`/procurement/requisitions/${requisitionId}/approve/`);
    return res.data.data;
  },

  // --- Purchase Orders ---
  getPurchaseOrders: async (params?: { status?: string; supplier_id?: string; search?: string }): Promise<PurchaseOrder[]> => {
    const res = await apiClient.get<ApiResponse<PurchaseOrder[]>>("/procurement/purchase-orders/", { params });
    return res.data.data;
  },

  createPurchaseOrder: async (data: {
    supplier_id: string;
    requisition_id?: string;
    items: Array<{ inventory_item_id: string; quantity_ordered: string; unit_cost?: string; unit?: string }>;
    location?: string;
    order_date?: string;
    expected_delivery_date?: string;
    tax_amount?: string;
    discount_amount?: string;
    notes?: string;
  }): Promise<PurchaseOrder> => {
    const res = await apiClient.post<ApiResponse<PurchaseOrder>>("/procurement/purchase-orders/", data);
    return res.data.data;
  },

  getPurchaseOrderDetail: async (poId: string): Promise<PurchaseOrder> => {
    const res = await apiClient.get<ApiResponse<PurchaseOrder>>(`/procurement/purchase-orders/${poId}/`);
    return res.data.data;
  },

  submitPurchaseOrder: async (poId: string): Promise<PurchaseOrder> => {
    const res = await apiClient.post<ApiResponse<PurchaseOrder>>(`/procurement/purchase-orders/${poId}/submit/`);
    return res.data.data;
  },

  approvePurchaseOrder: async (poId: string): Promise<PurchaseOrder> => {
    const res = await apiClient.post<ApiResponse<PurchaseOrder>>(`/procurement/purchase-orders/${poId}/approve/`);
    return res.data.data;
  },

  sendPurchaseOrder: async (poId: string): Promise<PurchaseOrder> => {
    const res = await apiClient.post<ApiResponse<PurchaseOrder>>(`/procurement/purchase-orders/${poId}/send/`);
    return res.data.data;
  },

  receiveGoods: async (
    poId: string,
    data: {
      items: Array<{
        purchase_order_item_id: string;
        quantity_received: string;
        quantity_accepted?: string;
        quantity_rejected?: string;
        rejection_reason?: string;
        batch_number?: string;
        expiry_date?: string;
        unit_cost_actual?: string;
      }>;
      invoice_number?: string;
      delivery_note_number?: string;
      idempotency_key?: string;
      notes?: string;
    }
  ): Promise<PurchaseReceipt> => {
    const res = await apiClient.post<ApiResponse<PurchaseReceipt>>(`/procurement/purchase-orders/${poId}/receive/`, data);
    return res.data.data;
  },

  cancelPurchaseOrder: async (poId: string): Promise<PurchaseOrder> => {
    const res = await apiClient.post<ApiResponse<PurchaseOrder>>(`/procurement/purchase-orders/${poId}/cancel/`);
    return res.data.data;
  },

  // --- Purchase Returns & Credits ---
  getPurchaseReturns: async (params?: { supplier_id?: string; status?: string }): Promise<PurchaseReturn[]> => {
    const res = await apiClient.get<ApiResponse<PurchaseReturn[]>>("/procurement/returns/", { params });
    return res.data.data;
  },

  createPurchaseReturn: async (data: {
    supplier_id: string;
    purchase_receipt_id?: string;
    reason: string;
    items: Array<{ inventory_item_id: string; quantity: string; unit_cost?: string; notes?: string }>;
    notes?: string;
  }): Promise<PurchaseReturn> => {
    const res = await apiClient.post<ApiResponse<PurchaseReturn>>("/procurement/returns/", data);
    return res.data.data;
  },

  approvePurchaseReturn: async (returnId: string): Promise<PurchaseReturn> => {
    const res = await apiClient.post<ApiResponse<PurchaseReturn>>(`/procurement/returns/${returnId}/approve/`);
    return res.data.data;
  },

  getSupplierCredits: async (params?: { supplier_id?: string; status?: string }): Promise<SupplierCredit[]> => {
    const res = await apiClient.get<ApiResponse<SupplierCredit[]>>("/procurement/credits/", { params });
    return res.data.data;
  },

  // --- Invoices & 3-Way Matching ---
  getSupplierInvoices: async (params?: { supplier_id?: string; match_status?: string }): Promise<SupplierInvoice[]> => {
    const res = await apiClient.get<ApiResponse<SupplierInvoice[]>>("/procurement/invoices/", { params });
    return res.data.data;
  },

  submitSupplierInvoice: async (data: {
    purchase_order_id: string;
    invoice_number: string;
    invoice_date: string;
    tax_amount?: string;
    items: Array<{ inventory_item_id: string; quantity_invoiced: string; unit_price: string; tax_amount?: string }>;
    notes?: string;
  }): Promise<SupplierInvoice> => {
    const res = await apiClient.post<ApiResponse<SupplierInvoice>>("/procurement/invoices/", data);
    return res.data.data;
  },

  // --- Budgets & Planning ---
  getProcurementBudgets: async (params?: { location?: string }): Promise<ProcurementBudget[]> => {
    const res = await apiClient.get<ApiResponse<ProcurementBudget[]>>("/procurement/budgets/", { params });
    return res.data.data;
  },

  createProcurementBudget: async (data: Partial<ProcurementBudget>): Promise<ProcurementBudget> => {
    const res = await apiClient.post<ApiResponse<ProcurementBudget>>("/procurement/budgets/", data);
    return res.data.data;
  },

  getPurchaseRecommendations: async (): Promise<PurchaseRecommendation[]> => {
    const res = await apiClient.get<ApiResponse<PurchaseRecommendation[]>>("/procurement/recommendations/");
    return res.data.data;
  },

  getProcurementReports: async (): Promise<ProcurementReports> => {
    const res = await apiClient.get<ApiResponse<ProcurementReports>>("/procurement/reports/");
    return res.data.data;
  },
};
