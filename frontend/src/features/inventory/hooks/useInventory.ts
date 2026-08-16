import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "../api/inventory.api";
import {
  CreateInventoryItemPayload,
  ReceiveStockPayload,
  AdjustStockPayload,
  WastagePayload,
} from "../types/inventory.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useInventory = (searchQuery?: string, lowStockOnly?: boolean) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Items query
  const itemsQuery = useQuery({
    queryKey: ["inventoryItems", searchQuery, lowStockOnly],
    queryFn: () => inventoryApi.getItems(searchQuery, lowStockOnly),
    enabled: isAuthenticated,
  });

  // Movements query
  const movementsQuery = useQuery({
    queryKey: ["stockMovements"],
    queryFn: () => inventoryApi.getMovements(),
    enabled: isAuthenticated,
  });

  // Recipes query
  const recipesQuery = useQuery({
    queryKey: ["recipes"],
    queryFn: () => inventoryApi.getRecipes(),
    enabled: isAuthenticated,
  });

  // Create Item mutation
  const createItemMutation = useMutation({
    mutationFn: (payload: CreateInventoryItemPayload) => inventoryApi.createItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
    },
  });

  // Receive Stock mutation
  const receiveStockMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReceiveStockPayload }) =>
      inventoryApi.receiveStock(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
    },
  });

  // Adjust Stock mutation
  const adjustStockMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdjustStockPayload }) =>
      inventoryApi.adjustStock(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
    },
  });

  // Record Wastage mutation
  const wastageMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WastagePayload }) =>
      inventoryApi.recordWastage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
    },
  });

  // Save Recipe mutation
  const saveRecipeMutation = useMutation({
    mutationFn: (payload: any) => inventoryApi.saveRecipe(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  return {
    items: itemsQuery.data?.data || [],
    isLoadingItems: itemsQuery.isLoading,
    movements: movementsQuery.data?.data || [],
    isLoadingMovements: movementsQuery.isLoading,
    recipes: recipesQuery.data?.data || [],
    isLoadingRecipes: recipesQuery.isLoading,
    createItem: createItemMutation.mutateAsync,
    isCreatingItem: createItemMutation.isPending,
    receiveStock: receiveStockMutation.mutateAsync,
    isReceivingStock: receiveStockMutation.isPending,
    adjustStock: adjustStockMutation.mutateAsync,
    isAdjustingStock: adjustStockMutation.isPending,
    recordWastage: wastageMutation.mutateAsync,
    isRecordingWastage: wastageMutation.isPending,
    saveRecipe: saveRecipeMutation.mutateAsync,
    isSavingRecipe: saveRecipeMutation.isPending,
  };
};
