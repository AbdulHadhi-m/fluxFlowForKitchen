import { apiClient } from '@/lib/api-client';
import {
  InventoryItem,
  InventoryBatch,
  StockMovement,
  Recipe,
  StockCount,
  InventoryTransfer,
  WasteRecord,
  FoodCostAnalysis,
  InventoryValuation,
  VarianceAnalysis,
  ReorderSuggestion,
} from '../types/inventory.types';

export const inventoryApi = {
  // Items
  getItems: async (params?: {
    item_type?: string;
    storage_location?: string;
    search?: string;
  }): Promise<InventoryItem[]> => {
    const res = await apiClient.get<any>('/inventory/items/', { params });
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  getItemDetail: async (id: string): Promise<InventoryItem> => {
    const res = await apiClient.get<any>(`/inventory/items/${id}/`);
    return res.data?.data || res.data;
  },

  createItem: async (data: any): Promise<InventoryItem> => {
    const res = await apiClient.post<any>('/inventory/items/', data);
    return res.data?.data || res.data;
  },

  updateItem: async (id: string, data: any): Promise<InventoryItem> => {
    const res = await apiClient.patch<any>(`/inventory/items/${id}/`, data);
    return res.data?.data || res.data;
  },

  receiveStock: async (
    itemId: string,
    payload: {
      quantity: string | number;
      unit: string;
      unit_cost?: string | number;
      batch_number?: string;
      expiry_date?: string;
      supplier_name?: string;
      reference?: string;
      reason?: string;
    }
  ) => {
    const res = await apiClient.post<any>(`/inventory/items/${itemId}/receive/`, payload);
    return res.data;
  },

  adjustStock: async (
    itemId: string,
    payload: { delta_quantity: string | number; reason: string }
  ) => {
    const res = await apiClient.post<any>(`/inventory/items/${itemId}/adjust/`, payload);
    return res.data;
  },

  getItemMovements: async (itemId: string): Promise<StockMovement[]> => {
    const res = await apiClient.get<any>(`/inventory/items/${itemId}/movements/`);
    const payload = res.data;
    return payload?.data || payload?.results || payload || [];
  },

  getItemBatches: async (itemId: string): Promise<InventoryBatch[]> => {
    const res = await apiClient.get<any>(`/inventory/items/${itemId}/batches/`);
    const payload = res.data;
    return payload?.data || payload?.results || payload || [];
  },

  analyzeCostImpact: async (itemId: string, newUnitCost: string | number) => {
    const res = await apiClient.post<any>(`/inventory/items/${itemId}/impact-analysis/`, {
      new_unit_cost: newUnitCost,
    });
    return res.data;
  },

  // Batches
  getBatches: async (params?: { batch_status?: string }): Promise<InventoryBatch[]> => {
    const res = await apiClient.get<any>('/inventory/batches/', { params });
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  // Movements Ledger
  getMovements: async (params?: { movement_type?: string }): Promise<StockMovement[]> => {
    const res = await apiClient.get<any>('/inventory/movements/', { params });
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  // Recipes
  getRecipes: async (params?: { status?: string; recipe_type?: string }): Promise<Recipe[]> => {
    const res = await apiClient.get<any>('/inventory/recipes/', { params });
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  getRecipeDetail: async (id: string): Promise<Recipe> => {
    const res = await apiClient.get<any>(`/inventory/recipes/${id}/`);
    return res.data?.data || res.data;
  },

  createRecipe: async (data: any): Promise<Recipe> => {
    const res = await apiClient.post<any>('/inventory/recipes/', data);
    return res.data?.data || res.data;
  },

  publishRecipe: async (id: string): Promise<Recipe> => {
    const res = await apiClient.post<any>(`/inventory/recipes/${id}/publish/`, {});
    return res.data?.data || res.data;
  },

  archiveRecipe: async (id: string): Promise<Recipe> => {
    const res = await apiClient.post<any>(`/inventory/recipes/${id}/archive/`, {});
    return res.data?.data || res.data;
  },

  getMenuItemCost: async (menuItemId: string): Promise<FoodCostAnalysis> => {
    const res = await apiClient.get<FoodCostAnalysis>(`/inventory/recipes/menu-item-cost/${menuItemId}/`);
    return (res.data as any)?.data || res.data;
  },

  // Stock Counts
  getStockCounts: async (): Promise<StockCount[]> => {
    const res = await apiClient.get<any>('/inventory/stock-counts/');
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  createStockCount: async (data: { location?: string; category?: string; notes?: string }): Promise<StockCount> => {
    const res = await apiClient.post<any>('/inventory/stock-counts/', data);
    return res.data?.data || res.data;
  },

  updateStockCountItems: async (
    countId: string,
    items: Array<{ item_id: string; counted_quantity: string | number; notes?: string }>
  ): Promise<StockCount> => {
    const res = await apiClient.post<any>(`/inventory/stock-counts/${countId}/update-items/`, { items });
    return res.data?.data || res.data;
  },

  submitStockCount: async (countId: string): Promise<StockCount> => {
    const res = await apiClient.post<any>(`/inventory/stock-counts/${countId}/submit/`, {});
    return res.data?.data || res.data;
  },

  approveStockCount: async (countId: string): Promise<StockCount> => {
    const res = await apiClient.post<any>(`/inventory/stock-counts/${countId}/approve/`, {});
    return res.data?.data || res.data;
  },

  // Transfers
  getTransfers: async (): Promise<InventoryTransfer[]> => {
    const res = await apiClient.get<any>('/inventory/transfers/');
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  createTransfer: async (data: {
    source_location: string;
    destination_location: string;
    items: Array<{ item_id: string; quantity: string | number; unit: string; notes?: string }>;
    notes?: string;
  }): Promise<InventoryTransfer> => {
    const res = await apiClient.post<any>('/inventory/transfers/', data);
    return res.data?.data || res.data;
  },

  approveTransfer: async (transferId: string): Promise<InventoryTransfer> => {
    const res = await apiClient.post<any>(`/inventory/transfers/${transferId}/approve/`, {});
    return res.data?.data || res.data;
  },

  receiveTransfer: async (transferId: string): Promise<InventoryTransfer> => {
    const res = await apiClient.post<any>(`/inventory/transfers/${transferId}/receive/`, {});
    return res.data?.data || res.data;
  },

  // Waste Logs
  getWasteRecords: async (): Promise<WasteRecord[]> => {
    const res = await apiClient.get<any>('/inventory/waste/');
    const payload = res.data;
    return payload?.data?.results || payload?.data || payload?.results || payload || [];
  },

  createWasteRecord: async (data: {
    item_id: string;
    quantity: string | number;
    reason: string;
    location?: string;
    batch_id?: string;
    notes?: string;
  }): Promise<WasteRecord> => {
    const res = await apiClient.post<any>('/inventory/waste/', data);
    return res.data?.data || res.data;
  },

  // Analytics & Costing
  getValuation: async (): Promise<InventoryValuation> => {
    const res = await apiClient.get<any>('/inventory/analytics/valuation/');
    return res.data?.data || res.data;
  },

  getVariance: async (params?: { start_date?: string; end_date?: string }): Promise<VarianceAnalysis> => {
    const res = await apiClient.get<any>('/inventory/analytics/variance/', { params });
    return res.data?.data || res.data;
  },

  getReorderSuggestions: async (): Promise<ReorderSuggestion[]> => {
    const res = await apiClient.get<any>('/inventory/analytics/reorder-suggestions/');
    const payload = res.data;
    return payload?.data || payload?.results || payload || [];
  },
};
