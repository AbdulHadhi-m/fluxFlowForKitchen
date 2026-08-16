import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { menuApi } from "../api/menu.api";
import {
  MenuCategoryCreatePayload,
  MenuCategoryUpdatePayload,
  MenuItemCreatePayload,
  MenuItemUpdatePayload,
} from "../types/menu.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useMenu = (params?: {
  category_id?: string;
  is_available?: boolean;
  is_active?: boolean;
  search?: string;
  page?: number;
}) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Categories Query
  const categoriesQuery = useQuery({
    queryKey: ["menuCategories"],
    queryFn: () => menuApi.getCategories().then((res) => res.data),
    enabled: isAuthenticated,
  });

  // Menu Items Query
  const menuItemsQuery = useQuery({
    queryKey: ["menuItems", params],
    queryFn: () => menuApi.getMenuItems(params),
    enabled: isAuthenticated,
  });

  // Create Category Mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: MenuCategoryCreatePayload) => menuApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuCategories"] });
    },
  });

  // Update Category Mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MenuCategoryUpdatePayload }) =>
      menuApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuCategories"] });
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
    },
  });

  // Delete/Deactivate Category Mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => menuApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuCategories"] });
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
    },
  });

  // Create Menu Item Mutation
  const createItemMutation = useMutation({
    mutationFn: (data: MenuItemCreatePayload) => menuApi.createMenuItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      queryClient.invalidateQueries({ queryKey: ["menuCategories"] });
    },
  });

  // Update Menu Item Mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MenuItemUpdatePayload }) =>
      menuApi.updateMenuItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
    },
  });

  // Toggle Availability Mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ id, is_available }: { id: string; is_available: boolean }) =>
      menuApi.setItemAvailability(id, is_available),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
    },
  });

  return {
    categories: categoriesQuery.data || [],
    isLoadingCategories: categoriesQuery.isLoading,
    menuItems: menuItemsQuery.data?.data || [],
    meta: menuItemsQuery.data?.meta,
    isLoadingItems: menuItemsQuery.isLoading,
    createCategory: createCategoryMutation.mutateAsync,
    isCreatingCategory: createCategoryMutation.isPending,
    updateCategory: updateCategoryMutation.mutateAsync,
    isUpdatingCategory: updateCategoryMutation.isPending,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isDeletingCategory: deleteCategoryMutation.isPending,
    createMenuItem: createItemMutation.mutateAsync,
    isCreatingItem: createItemMutation.isPending,
    updateMenuItem: updateItemMutation.mutateAsync,
    isUpdatingItem: updateItemMutation.isPending,
    toggleAvailability: toggleAvailabilityMutation.mutateAsync,
    isTogglingAvailability: toggleAvailabilityMutation.isPending,
  };
};
