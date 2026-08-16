import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "../api/customers.api";
import { CreateCustomerPayload } from "../types/customers.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useCustomers = (search?: string, tag?: string) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const customersQuery = useQuery({
    queryKey: ["customers", search, tag],
    queryFn: () => customersApi.getCustomers({ search, tag }),
    enabled: isAuthenticated,
  });

  const analyticsQuery = useQuery({
    queryKey: ["crmAnalytics"],
    queryFn: () => customersApi.getCRMAnalytics(),
    enabled: isAuthenticated,
  });

  const tagsQuery = useQuery({
    queryKey: ["customerTags"],
    queryFn: () => customersApi.getCustomerTags(),
    enabled: isAuthenticated,
  });

  const createCustomerMutation = useMutation({
    mutationFn: (payload: CreateCustomerPayload) => customersApi.createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["crmAnalytics"] });
    },
  });

  const mergeCustomersMutation = useMutation({
    mutationFn: ({ primaryId, duplicateId }: { primaryId: string; duplicateId: string }) =>
      customersApi.mergeCustomers(primaryId, duplicateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["crmAnalytics"] });
    },
  });

  return {
    customers: customersQuery.data?.data || [],
    isLoadingCustomers: customersQuery.isLoading,
    analytics: analyticsQuery.data?.data,
    isLoadingAnalytics: analyticsQuery.isLoading,
    tags: tagsQuery.data?.data || [],
    createCustomer: createCustomerMutation.mutateAsync,
    isCreatingCustomer: createCustomerMutation.isPending,
    mergeCustomers: mergeCustomersMutation.mutateAsync,
    isMergingCustomers: mergeCustomersMutation.isPending,
  };
};
