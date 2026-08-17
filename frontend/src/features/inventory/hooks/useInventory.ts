import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventory.api';

export function useInventoryItems(params?: {
  item_type?: string;
  storage_location?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['inventory-items', params],
    queryFn: () => inventoryApi.getItems(params),
  });
}

export const useInventory = useInventoryItems;

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: ['inventory-item', id],
    queryFn: () => inventoryApi.getItemDetail(id),
    enabled: !!id,
  });
}

export function useInventoryMovements(params?: { movement_type?: string }) {
  return useQuery({
    queryKey: ['inventory-movements', params],
    queryFn: () => inventoryApi.getMovements(params),
  });
}

export function useItemMovements(itemId: string) {
  return useQuery({
    queryKey: ['inventory-item-movements', itemId],
    queryFn: () => inventoryApi.getItemMovements(itemId),
    enabled: !!itemId,
  });
}

export function useItemBatches(itemId: string) {
  return useQuery({
    queryKey: ['inventory-item-batches', itemId],
    queryFn: () => inventoryApi.getItemBatches(itemId),
    enabled: !!itemId,
  });
}

export function useInventoryBatches(params?: { batch_status?: string }) {
  return useQuery({
    queryKey: ['inventory-batches', params],
    queryFn: () => inventoryApi.getBatches(params),
  });
}

export function useRecipes(params?: { status?: string; recipe_type?: string }) {
  return useQuery({
    queryKey: ['inventory-recipes', params],
    queryFn: () => inventoryApi.getRecipes(params),
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ['inventory-recipe', id],
    queryFn: () => inventoryApi.getRecipeDetail(id),
    enabled: !!id,
  });
}

export function useMenuItemCost(menuItemId: string) {
  return useQuery({
    queryKey: ['menu-item-cost', menuItemId],
    queryFn: () => inventoryApi.getMenuItemCost(menuItemId),
    enabled: !!menuItemId,
  });
}

export function useStockCounts() {
  return useQuery({
    queryKey: ['inventory-stock-counts'],
    queryFn: () => inventoryApi.getStockCounts(),
  });
}

export function useTransfers() {
  return useQuery({
    queryKey: ['inventory-transfers'],
    queryFn: () => inventoryApi.getTransfers(),
  });
}

export function useWasteRecords() {
  return useQuery({
    queryKey: ['inventory-waste-records'],
    queryFn: () => inventoryApi.getWasteRecords(),
  });
}

export function useInventoryValuation() {
  return useQuery({
    queryKey: ['inventory-valuation'],
    queryFn: () => inventoryApi.getValuation(),
  });
}

export function useVarianceAnalysis(params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: ['inventory-variance', params],
    queryFn: () => inventoryApi.getVariance(params),
  });
}

export function useReorderSuggestions() {
  return useQuery({
    queryKey: ['inventory-reorder-suggestions'],
    queryFn: () => inventoryApi.getReorderSuggestions(),
  });
}

// Mutations
export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => inventoryApi.createItem(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-valuation'] });
    },
  });
}

export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: any }) =>
      inventoryApi.receiveStock(itemId, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-item', variables.itemId] });
      qc.invalidateQueries({ queryKey: ['inventory-movements'] });
      qc.invalidateQueries({ queryKey: ['inventory-item-movements', variables.itemId] });
      qc.invalidateQueries({ queryKey: ['inventory-item-batches', variables.itemId] });
      qc.invalidateQueries({ queryKey: ['inventory-valuation'] });
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: any }) =>
      inventoryApi.adjustStock(itemId, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-item', variables.itemId] });
      qc.invalidateQueries({ queryKey: ['inventory-movements'] });
      qc.invalidateQueries({ queryKey: ['inventory-item-movements', variables.itemId] });
      qc.invalidateQueries({ queryKey: ['inventory-valuation'] });
    },
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => inventoryApi.createRecipe(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-recipes'] });
    },
  });
}

export function usePublishRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.publishRecipe(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-recipes'] });
    },
  });
}

export function useArchiveRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.archiveRecipe(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-recipes'] });
    },
  });
}

export function useCreateStockCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => inventoryApi.createStockCount(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-stock-counts'] });
    },
  });
}

export function useUpdateStockCountItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ countId, items }: { countId: string; items: any[] }) =>
      inventoryApi.updateStockCountItems(countId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-stock-counts'] });
    },
  });
}

export function useSubmitStockCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (countId: string) => inventoryApi.submitStockCount(countId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-stock-counts'] });
    },
  });
}

export function useApproveStockCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (countId: string) => inventoryApi.approveStockCount(countId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-stock-counts'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-movements'] });
      qc.invalidateQueries({ queryKey: ['inventory-valuation'] });
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => inventoryApi.createTransfer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfers'] });
    },
  });
}

export function useApproveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => inventoryApi.approveTransfer(transferId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfers'] });
      qc.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });
}

export function useReceiveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => inventoryApi.receiveTransfer(transferId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfers'] });
      qc.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });
}

export function useCreateWasteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => inventoryApi.createWasteRecord(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-waste-records'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-movements'] });
      qc.invalidateQueries({ queryKey: ['inventory-valuation'] });
    },
  });
}
