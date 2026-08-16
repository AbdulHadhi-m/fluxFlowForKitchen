import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kitchenApi } from "../api/kitchen.api";
import { KitchenStatus } from "../types/kitchen.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useKitchenTickets = (statusFilter?: KitchenStatus | "") => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Tickets Query
  const ticketsQuery = useQuery({
    queryKey: ["kitchenTickets", statusFilter],
    queryFn: () => kitchenApi.getTickets(statusFilter),
    enabled: isAuthenticated,
    refetchInterval: 15000, // Background fallback sync
  });

  // Start Mutation (NEW -> PREPARING)
  const startMutation = useMutation({
    mutationFn: (id: string) => kitchenApi.startTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchenTickets"] });
    },
  });

  // Ready Mutation (PREPARING -> READY)
  const readyMutation = useMutation({
    mutationFn: (id: string) => kitchenApi.readyTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchenTickets"] });
    },
  });

  // Complete Mutation (READY -> COMPLETED)
  const completeMutation = useMutation({
    mutationFn: (id: string) => kitchenApi.completeTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchenTickets"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurantTables"] });
    },
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => kitchenApi.cancelTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchenTickets"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurantTables"] });
    },
  });

  return {
    tickets: ticketsQuery.data?.data || [],
    isLoading: ticketsQuery.isLoading,
    isError: ticketsQuery.isError,
    startTicket: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    readyTicket: readyMutation.mutateAsync,
    isReadying: readyMutation.isPending,
    completeTicket: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,
    cancelTicket: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
};
