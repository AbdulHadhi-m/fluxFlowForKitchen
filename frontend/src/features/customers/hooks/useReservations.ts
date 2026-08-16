import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "../api/customers.api";
import { CreateReservationPayload } from "../types/customers.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useReservations = (date?: string, status?: string) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const reservationsQuery = useQuery({
    queryKey: ["reservations", date, status],
    queryFn: () => customersApi.getReservations({ date, status }),
    enabled: isAuthenticated,
  });

  const createReservationMutation = useMutation({
    mutationFn: (payload: CreateReservationPayload) => customersApi.createReservation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      customersApi.updateReservationStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  return {
    reservations: reservationsQuery.data?.data || [],
    isLoadingReservations: reservationsQuery.isLoading,
    createReservation: createReservationMutation.mutateAsync,
    isCreatingReservation: createReservationMutation.isPending,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
};
