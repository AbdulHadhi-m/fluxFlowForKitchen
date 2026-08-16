import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "../api/billing.api";
import { CreateBillPayload, ProcessPaymentPayload } from "../types/billing.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useBilling = (statusFilter?: string, searchQuery?: string) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Bills list query
  const billsQuery = useQuery({
    queryKey: ["bills", statusFilter, searchQuery],
    queryFn: () => billingApi.getBills(statusFilter, searchQuery),
    enabled: isAuthenticated,
  });

  // Eligible orders query
  const eligibleOrdersQuery = useQuery({
    queryKey: ["eligibleOrdersForBilling"],
    queryFn: () => billingApi.getEligibleOrders(),
    enabled: isAuthenticated,
  });

  // Create Bill mutation
  const createBillMutation = useMutation({
    mutationFn: (payload: CreateBillPayload) => billingApi.createBill(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["eligibleOrdersForBilling"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  // Process Payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: ({ billId, payload }: { billId: string; payload: ProcessPaymentPayload }) =>
      billingApi.processPayment(billId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["restaurantTables"] });
      queryClient.invalidateQueries({ queryKey: ["eligibleOrdersForBilling"] });
    },
  });

  // Void Bill mutation
  const voidBillMutation = useMutation({
    mutationFn: ({ billId, reason }: { billId: string; reason?: string }) =>
      billingApi.voidBill(billId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["eligibleOrdersForBilling"] });
    },
  });

  return {
    bills: billsQuery.data?.data || [],
    isLoadingBills: billsQuery.isLoading,
    eligibleOrders: eligibleOrdersQuery.data?.data || [],
    isLoadingEligibleOrders: eligibleOrdersQuery.isLoading,
    createBill: createBillMutation.mutateAsync,
    isCreatingBill: createBillMutation.isPending,
    processPayment: processPaymentMutation.mutateAsync,
    isProcessingPayment: processPaymentMutation.isPending,
    voidBill: voidBillMutation.mutateAsync,
    isVoidingBill: voidBillMutation.isPending,
  };
};
