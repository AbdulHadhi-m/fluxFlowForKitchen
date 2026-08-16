import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "../api/order.api";
import { OrderCreatePayload } from "../types/order.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useOrders = (params?: {
  status?: string;
  table_id?: string;
  search?: string;
  page?: number;
}) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Orders List Query
  const ordersQuery = useQuery({
    queryKey: ["orders", params],
    queryFn: () => orderApi.getOrders(params),
    enabled: isAuthenticated,
  });

  // Create Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: (data: OrderCreatePayload) => orderApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurantTables"] });
    },
  });

  // Cancel Order Mutation
  const cancelOrderMutation = useMutation({
    mutationFn: (id: string) => orderApi.cancelOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurantTables"] });
    },
  });

  // Complete Order Mutation
  const completeOrderMutation = useMutation({
    mutationFn: (id: string) => orderApi.completeOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurantTables"] });
    },
  });

  return {
    orders: ordersQuery.data?.data || [],
    meta: ordersQuery.data?.meta,
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    createOrder: createOrderMutation.mutateAsync,
    isCreating: createOrderMutation.isPending,
    cancelOrder: cancelOrderMutation.mutateAsync,
    isCancelling: cancelOrderMutation.isPending,
    completeOrder: completeOrderMutation.mutateAsync,
    isCompleting: completeOrderMutation.isPending,
  };
};
