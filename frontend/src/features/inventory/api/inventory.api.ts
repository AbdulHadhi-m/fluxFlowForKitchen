import { apiClient } from "@/lib/api-client";
import {
  InventoryItem,
  StockMovement,
  Recipe,
  CreateInventoryItemPayload,
  ReceiveStockPayload,
  AdjustStockPayload,
  WastagePayload,
} from "../types/inventory.types";

export const inventoryApi = {
  async getItems(search?: string, lowStock?: boolean, isActive?: boolean): Promise<{ success: boolean; data: InventoryItem[] }> {
    const params = {
      ...(search ? { search } : {}),
      ...(lowStock !== undefined ? { low_stock: lowStock } : {}),
      ...(isActive !== undefined ? { is_active: isActive } : {}),
    };
    const response = await apiClient.get<{ success: boolean; data: InventoryItem[] }>("/inventory/items/", { params });
    return response.data;
  },

  async getItem(id: string): Promise<{ success: boolean; data: InventoryItem }> {
    const response = await apiClient.get<{ success: boolean; data: InventoryItem }>(`/inventory/items/${id}/`);
    return response.data;
  },

  async createItem(payload: CreateInventoryItemPayload): Promise<{ success: boolean; data: InventoryItem }> {
    const response = await apiClient.post<{ success: boolean; data: InventoryItem }>("/inventory/items/", payload);
    return response.data;
  },

  async receiveStock(
    id: string,
    payload: ReceiveStockPayload
  ): Promise<{ success: boolean; data: { movement: StockMovement; item: InventoryItem } }> {
    const response = await apiClient.post<{ success: boolean; data: { movement: StockMovement; item: InventoryItem } }>(
      `/inventory/items/${id}/receive/`,
      payload
    );
    return response.data;
  },

  async adjustStock(
    id: string,
    payload: AdjustStockPayload
  ): Promise<{ success: boolean; data: { movement: StockMovement; item: InventoryItem } }> {
    const response = await apiClient.post<{ success: boolean; data: { movement: StockMovement; item: InventoryItem } }>(
      `/inventory/items/${id}/adjust/`,
      payload
    );
    return response.data;
  },

  async recordWastage(
    id: string,
    payload: WastagePayload
  ): Promise<{ success: boolean; data: { movement: StockMovement; item: InventoryItem } }> {
    const response = await apiClient.post<{ success: boolean; data: { movement: StockMovement; item: InventoryItem } }>(
      `/inventory/items/${id}/waste/`,
      payload
    );
    return response.data;
  },

  async getMovements(itemId?: string, movementType?: string): Promise<{ success: boolean; data: StockMovement[] }> {
    const params = {
      ...(itemId ? { item_id: itemId } : {}),
      ...(movementType ? { movement_type: movementType } : {}),
    };
    const response = await apiClient.get<{ success: boolean; data: StockMovement[] }>("/inventory/movements/", { params });
    return response.data;
  },

  async getRecipes(): Promise<{ success: boolean; data: Recipe[] }> {
    const response = await apiClient.get<{ success: boolean; data: Recipe[] }>("/inventory/recipes/");
    return response.data;
  },

  async saveRecipe(payload: { menu_item_id: string; yield_quantity?: number; instructions?: string; ingredients: { inventory_item_id: string; quantity: number; unit?: string }[] }): Promise<{ success: boolean; data: Recipe }> {
    const response = await apiClient.post<{ success: boolean; data: Recipe }>("/inventory/recipes/", payload);
    return response.data;
  },
};
